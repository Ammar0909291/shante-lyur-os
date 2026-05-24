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
import { broadcastOpsEvent, type OpsEvent } from '@/lib/ops-sse';

// ─── Valid transition map ─────────────────────────────────────────────────────

const ALLOWED: Record<string, TransitionAction[]> = {
  PENDING:     ['confirm', 'checkin', 'start', 'noshow', 'cancel'],
  CONFIRMED:   ['checkin', 'start', 'noshow', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
  RESCHEDULED: [],
};

const ACTION_TO_STATUS: Record<TransitionAction, string> = {
  confirm: 'CONFIRMED',
  checkin: 'CONFIRMED',
  start:   'IN_PROGRESS',
  complete: 'COMPLETED',
  noshow:  'NO_SHOW',
  cancel:  'CANCELLED',
};

const ACTION_TO_EVENT: Record<TransitionAction, OpsEvent['type']> = {
  confirm:  'booking_confirmed',
  checkin:  'client_arrived',
  start:    'booking_started',
  complete: 'booking_completed',
  noshow:   'booking_no_show',
  cancel:   'booking_cancelled',
};

// ─── Inventory deduction helper ───────────────────────────────────────────────

async function deductInventoryForAppointment(
  appointmentId: string,
  userId: string | null,
): Promise<{ deducted: number; warnings: string[] }> {
  const warnings: string[] = [];

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

  // Idempotency guard: skip if USAGE movements already exist for this appointment
  const existingUsage = await prisma.stockMovement.count({
    where: { appointmentId, type: 'USAGE' },
  });
  if (existingUsage > 0) {
    console.log('[inventory/deduct] already deducted for appointment, skipping', { appointmentId, existingUsage });
    return { deducted: 0, warnings: [] };
  }

  const txOps: Parameters<typeof prisma.$transaction>[0] extends Array<infer T> ? T[] : never[] = [];
  let deductedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const [itemId, info] of deductionMap.entries()) {
      const current = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        select: { currentStock: true },
      });
      if (!current) {
        warnings.push(`Item ${info.itemName} not found during deduction`);
        continue;
      }

      const currentStock = Number(current.currentStock);
      let signedQty = -info.qty;
      let newBalance = currentStock + signedQty;

      if (newBalance < 0) {
        warnings.push(`${info.itemName}: insufficient stock (have ${currentStock} ${info.unit}, need ${info.qty}). Clamped to 0.`);
        signedQty = -currentStock;
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

  void txOps;
  return { deducted: deductedCount, warnings };
}

// ─── Create in-app notification for specialist ────────────────────────────────

async function notifySpecialist(
  action: TransitionAction,
  aptFull: {
    id: string;
    specialistUserId: string;
    clientName: string;
    specialistName: string;
    startAt: string;
    roomName: string | null;
    serviceNames: string[];
  },
) {
  const notifMap: Partial<Record<TransitionAction, { title: string; body: string }>> = {
    checkin: {
      title: 'Клиент прибыл',
      body: `${aptFull.clientName} ожидает вас${aptFull.roomName ? ` в ${aptFull.roomName}` : ''}`,
    },
    cancel: {
      title: 'Запись отменена',
      body: `Запись ${aptFull.clientName} на ${new Date(aptFull.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} отменена`,
    },
    complete: {
      title: 'Процедура завершена',
      body: `${aptFull.clientName} — ${aptFull.serviceNames[0] ?? 'процедура'} успешно завершена`,
    },
    noshow: {
      title: 'Клиент не пришёл',
      body: `${aptFull.clientName} отмечен как неявка`,
    },
  };

  const notif = notifMap[action];
  if (!notif) return;

  try {
    await prisma.notification.create({
      data: {
        userId: aptFull.specialistUserId,
        type: 'SYSTEM',
        channel: 'IN_APP',
        status: 'SENT',
        title: notif.title,
        body: notif.body,
        appointmentId: aptFull.id,
        data: { action, clientName: aptFull.clientName, roomName: aptFull.roomName },
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[ops/transition] notification create error', err);
  }
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
  try { body = (await request.json()) as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { action } = body;
  if (!action) return apiError('BAD_REQUEST', 'action is required', 400);

  console.log('[ops/transition]', { id, action, userId });

  try {
    // Fetch appointment with context for SSE/notifications
    const apt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        checkedInAt: true,
        startAt: true,
        client: { select: { firstName: true, lastName: true } },
        specialist: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        room: { select: { name: true } },
        services: { select: { service: { select: { name: true } } } },
      },
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
      updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'COMPLETED', checkedOutAt: now },
        select: { id: true, status: true, checkedInAt: true, checkedOutAt: true },
      });

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

    // ── SSE broadcast + notification ───────────────────────────────────────────
    const clientName = apt.client ? `${apt.client.firstName} ${apt.client.lastName}` : '';
    const specialistName = apt.specialist?.user
      ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`
      : '';
    const roomName = apt.room?.name ?? null;
    const serviceNames = apt.services?.map((s) => s.service.name) ?? [];

    const sseEvent: OpsEvent = {
      type: ACTION_TO_EVENT[action as TransitionAction] ?? 'ops_refresh',
      appointmentId: id,
      clientName,
      specialistId: apt.specialist?.id,
      specialistName,
      roomName: roomName ?? undefined,
      fromStatus: currentStatus,
      toStatus: ACTION_TO_STATUS[action as TransitionAction] ?? updated.status,
      ts: now.toISOString(),
    };
    broadcastOpsEvent(sseEvent);

    if (apt.specialist?.user?.id) {
      void notifySpecialist(action as TransitionAction, {
        id,
        specialistUserId: apt.specialist.user.id,
        clientName,
        specialistName,
        startAt: apt.startAt?.toISOString() ?? now.toISOString(),
        roomName,
        serviceNames,
      });
    }

    // ── Audit ──────────────────────────────────────────────────────────────────
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
