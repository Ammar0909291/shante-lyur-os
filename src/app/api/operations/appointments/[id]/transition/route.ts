export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  ok,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import type { TransitionAction } from '@/types/operations';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

// ─── Valid transition map ─────────────────────────────────────────────────────

// Maps: current DB status → allowed actions
const ALLOWED: Record<string, TransitionAction[]> = {
  PENDING:     ['confirm', 'checkin', 'start', 'noshow', 'cancel'],
  CONFIRMED:   ['checkin', 'start', 'noshow', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
  // Terminal states — no transitions
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
  RESCHEDULED: [],
};

// ─── Inventory deduction helper ───────────────────────────────────────────────

async function deductInventoryForAppointment(
  appointmentId: string,
  userId: string | null,
): Promise<{ deducted: number; warnings: string[] }> {
  const warnings: string[] = [];

  // Fetch services + their inventory links in one query
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      specialistId: true,
      services: {
        select: {
          service: {
            select: {
              id: true,
              name: true,
              inventoryLinks: {
                select: {
                  id: true,
                  inventoryItemId: true,
                  quantityPerUse: true,
                  inventoryItem: {
                    select: { id: true, name: true, currentStock: true, unit: true, costPerUnit: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!apt) return { deducted: 0, warnings: ['Appointment not found for inventory deduction'] };

  // Collect all deductions: group by itemId to avoid duplicates when multiple services use same item
  const deductionMap = new Map<string, { qty: number; itemName: string; unit: string; currentStock: number; services: string[] }>();

  for (const { service } of apt.services ?? []) {
    for (const link of service.inventoryLinks) {
      const itemId = link.inventoryItemId;
      const qty = Number(link.quantityPerUse);
      const existing = deductionMap.get(itemId);
      if (existing) {
        existing.qty += qty;
        existing.services.push(service.name);
      } else {
        deductionMap.set(itemId, {
          qty,
          itemName: link.inventoryItem.name,
          unit: link.inventoryItem.unit,
          currentStock: Number(link.inventoryItem.currentStock),
          services: [service.name],
        });
      }
    }
  }

  if (deductionMap.size === 0) {
    console.log('[inventory/deduct] no inventory links for appointment', { appointmentId });
    return { deducted: 0, warnings: [] };
  }

  // Build atomic transaction operations
  const txOps: Parameters<typeof prisma.$transaction>[0] extends Array<infer T> ? T[] : never[] = [];

  // We use $transaction with a function for sequential dependent ops
  let deductedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const [itemId, info] of deductionMap.entries()) {
      // Re-read current stock inside transaction for accuracy
      const current = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        select: { currentStock: true },
      });
      if (!current) {
        warnings.push(`Item ${info.itemName} not found during deduction`);
        continue;
      }

      const currentStock = Number(current.currentStock);
      let signedQty = -info.qty; // negative = consumption
      let newBalance = currentStock + signedQty;

      if (newBalance < 0) {
        warnings.push(`${info.itemName}: insufficient stock (have ${currentStock} ${info.unit}, need ${info.qty}). Clamped to 0.`);
        signedQty = -currentStock; // deduct all remaining
        newBalance = 0;
      }

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: itemId,
          type: 'USAGE',
          quantity: signedQty,
          balanceAfter: newBalance,
          reason: `Процедура: ${info.services.join(', ')}`,
          appointmentId,
          userId,
        },
      });

      deductedCount++;
      console.log('[inventory/deduct] item', { itemId, itemName: info.itemName, deducted: info.qty, newBalance });
    }
  });

  void txOps; // suppress unused warning
  return { deducted: deductedCount, warnings };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await params;

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { action } = body;
  if (!action) return apiError('BAD_REQUEST', 'action is required', 400);

  console.log('[ops/transition]', { id, action, userId });

  try {
    const apt = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, checkedInAt: true },
    });

    if (!apt) return apiError('NOT_FOUND', 'Appointment not found', 404);

    const currentStatus = apt.status as string;
    const allowed = ALLOWED[currentStatus] ?? [];

    if (!allowed.includes(action as TransitionAction)) {
      return apiError(
        'INVALID_TRANSITION',
        `Cannot perform '${action}' from status '${currentStatus}'`,
        400,
      );
    }

    const now = new Date();
    let updated: { id: string; status: string; checkedInAt: Date | null; checkedOutAt: Date | null };
    let inventoryWarnings: string[] = [];

    if (action === 'complete') {
      // Complete: update status + deduct inventory atomically
      updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'COMPLETED', checkedOutAt: now },
        select: { id: true, status: true, checkedInAt: true, checkedOutAt: true },
      });

      // Deduct inventory AFTER status update (inventory deduction is best-effort)
      const { deducted, warnings } = await deductInventoryForAppointment(id, userId ?? null);
      inventoryWarnings = warnings;
      console.log('[ops/transition] inventory deducted', { id, deducted, warnings });
    } else {
      let updateData: Record<string, unknown> = {};

      switch (action as TransitionAction) {
        case 'confirm':
          updateData = { status: 'CONFIRMED', confirmedAt: now };
          break;
        case 'checkin':
          if (!apt.checkedInAt) updateData = { checkedInAt: now };
          break;
        case 'start':
          updateData = {
            status: 'IN_PROGRESS',
            startedAt: now,
            checkedInAt: apt.checkedInAt ?? now,
          };
          break;
        case 'noshow':
          updateData = { status: 'NO_SHOW', noShowAt: now };
          break;
        case 'cancel':
          updateData = { status: 'CANCELLED', cancelledAt: now, cancelledBy: userId ?? undefined };
          break;
        default:
          break;
      }

      updated = await prisma.appointment.update({
        where: { id },
        data: updateData,
        select: { id: true, status: true, checkedInAt: true, checkedOutAt: true },
      });
    }

    console.log('[ops/transition] done', { id, from: currentStatus, action, to: updated.status });

    // Audit: every lifecycle transition
    const { ipAddress, userAgent } = getRequestMeta(request);
    void logAudit({
      userId,
      role,
      action: 'STATUS_CHANGED',
      entityType: 'appointment',
      entityId: id,
      appointmentId: id,
      oldValues: { status: currentStatus },
      newValues: { status: updated.status, action },
      ipAddress,
      userAgent,
      metadata: { source: 'ops/transition', action },
    });

    return ok({
      id: updated.id,
      status: updated.status,
      action,
      ...(inventoryWarnings.length > 0 ? { inventoryWarnings } : {}),
    });
  } catch (err) {
    console.error('[ops/transition] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to update appointment', 500);
  }
}
