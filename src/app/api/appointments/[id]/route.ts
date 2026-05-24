export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError, validationError, unauthorized, notFound, forbidden, internalError } from '@/lib/api-response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

const PatchSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

// Valid status transitions — direct status write (non-operations flow)
const TRANSITIONS: Record<string, string[]> = {
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'] as const;

function computeLoyaltyTier(visits: number, spent: number): string {
  if (visits >= 50 || spent >= 100_000) return 'VIP';
  if (visits >= 25 || spent >= 50_000)  return 'PLATINUM';
  if (visits >= 10 || spent >= 20_000)  return 'GOLD';
  if (visits >= 3  || spent >= 5_000)   return 'SILVER';
  return 'BRONZE';
}

async function syncSpecialistRevenue(
  appointmentId: string,
  specialistId: string,
  amount: number,
  startAt: Date,
): Promise<void> {
  const existing = await prisma.revenueRecord.findFirst({ where: { appointmentId } });
  if (!existing) {
    await prisma.revenueRecord.create({
      data: {
        id: crypto.randomUUID(),
        date: startAt,
        type: 'SERVICE_PAYMENT',
        amount,
        specialistId,
        appointmentId,
      },
    });
  }
}

async function removeSpecialistRevenue(appointmentId: string): Promise<void> {
  await prisma.revenueRecord.deleteMany({ where: { appointmentId } });
}

async function syncClientProfile(clientId: string): Promise<void> {
  const [completedAgg, firstAppt, lastAppt] = await Promise.all([
    prisma.appointment.aggregate({
      where: { clientId, status: 'COMPLETED' },
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    prisma.appointment.findFirst({
      where: { clientId, status: 'COMPLETED' },
      orderBy: { startAt: 'asc' },
      select: { startAt: true },
    }),
    prisma.appointment.findFirst({
      where: { clientId, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
      select: { startAt: true },
    }),
  ]);

  const totalVisits = completedAgg._count.id;
  const totalSpent  = Number(completedAgg._sum.totalPrice ?? 0);
  const loyaltyTier = computeLoyaltyTier(totalVisits, totalSpent);

  await prisma.customerProfile.upsert({
    where:  { userId: clientId },
    create: {
      id: crypto.randomUUID(),
      userId: clientId,
      totalVisits,
      totalSpent,
      loyaltyTier,
      firstVisitAt: firstAppt?.startAt ?? null,
      lastVisitAt:  lastAppt?.startAt  ?? null,
    },
    update: {
      totalVisits,
      totalSpent,
      loyaltyTier,
      lastVisitAt: lastAppt?.startAt ?? null,
      ...(firstAppt ? { firstVisitAt: firstAppt.startAt } : {}),
    },
  });
}

async function deductInventory(appointmentId: string, userId?: string): Promise<void> {
  const apptServices = await prisma.appointmentService.findMany({
    where: { appointmentId },
    select: { serviceId: true },
  });
  if (apptServices.length === 0) return;

  const serviceIds = apptServices.map((s) => s.serviceId);
  const links = await prisma.inventoryServiceLink.findMany({
    where: { serviceId: { in: serviceIds } },
    select: { inventoryItemId: true, quantityPerUse: true },
  });
  if (links.length === 0) return;

  const deductions = new Map<string, number>();
  for (const link of links) {
    deductions.set(link.inventoryItemId, (deductions.get(link.inventoryItemId) ?? 0) + Number(link.quantityPerUse));
  }

  for (const [itemId, qty] of Array.from(deductions.entries())) {
    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: { decrement: qty } },
    }).catch(() => null);
    if (!updated) continue;

    await prisma.stockMovement.create({
      data: {
        id: crypto.randomUUID(),
        inventoryItemId: itemId,
        type: 'USAGE',
        quantity: -qty,
        balanceAfter: Number(updated.currentStock),
        reason: 'Автоматическое списание при завершении процедуры',
        appointmentId,
        userId: userId ?? null,
      },
    }).catch(() => null);
  }
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return unauthorized();

    const { id } = await context.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client:     { select: { id: true, firstName: true, lastName: true, email: true } },
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        services:   { include: { service: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } },
        location:   { select: { id: true, name: true } },
      },
    });

    if (!appointment) return notFound('Appointment');

    // Role-based access: client can only see their own, specialist their own
    if (role === 'CLIENT' && appointment.clientId !== userId) return forbidden();
    if (role === 'SPECIALIST') {
      const spec = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
      if (!spec || appointment.specialistId !== spec.id) return forbidden();
    }

    return ok(appointment);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : undefined);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? '';
    if (!userId) return unauthorized();

    // Only admin staff can directly patch status via this endpoint
    if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
      return forbidden('Only admin staff can update appointment status directly');
    }

    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return validationError('Invalid request body');

    const { status: newStatus } = parsed.data;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, clientId: true, specialistId: true, startAt: true, totalPrice: true },
    });
    if (!existing) return notFound('Appointment');

    const allowed = TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return apiError(
        'INVALID_TRANSITION',
        `Cannot change status from ${existing.status} to ${newStatus}`,
        422,
      );
    }

    const now = new Date();
    const timestampData: Record<string, Date> = {};
    if (newStatus === 'CONFIRMED') timestampData.confirmedAt = now;
    if (newStatus === 'IN_PROGRESS') timestampData.startedAt = now;
    if (newStatus === 'CANCELLED') timestampData.cancelledAt = now;
    if (newStatus === 'NO_SHOW') timestampData.noShowAt = now;
    if (newStatus === 'COMPLETED') timestampData.checkedOutAt = now;

    const updated = await prisma.appointment.update({
      where: { id },
      data:  { status: newStatus, ...timestampData, cancelledBy: newStatus === 'CANCELLED' ? userId : undefined },
      select: { id: true, status: true, clientId: true, startAt: true, endAt: true, totalPrice: true },
    });

    // Sync client + specialist stats on terminal states
    if (newStatus === 'COMPLETED') {
      await Promise.all([
        syncClientProfile(existing.clientId),
        syncSpecialistRevenue(id, existing.specialistId, Number(existing.totalPrice), existing.startAt),
        deductInventory(id, userId),
      ]);
    } else if (newStatus === 'CANCELLED' || newStatus === 'NO_SHOW') {
      await Promise.all([
        syncClientProfile(existing.clientId),
        removeSpecialistRevenue(id),
      ]);
    }

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(req);
    void logAudit({
      userId,
      role,
      action: 'STATUS_CHANGED',
      entityType: 'appointment',
      entityId: id,
      appointmentId: id,
      oldValues: { status: existing.status },
      newValues: { status: newStatus, ...timestampData },
      ipAddress,
      userAgent,
    });

    return ok(updated);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? '';
    if (!userId) return unauthorized();

    if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
      return forbidden('Only admin staff can cancel appointments');
    }

    const { id } = await context.params;
    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, clientId: true },
    });
    if (!existing) return notFound('Appointment');

    if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
      return apiError('INVALID_TRANSITION', 'Cannot cancel a completed or already-cancelled appointment', 422);
    }

    await prisma.appointment.update({
      where: { id },
      data:  { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
    });

    await Promise.all([
      syncClientProfile(existing.clientId),
      removeSpecialistRevenue(id),
    ]);

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(req);
    void logAudit({
      userId,
      role,
      action: 'STATUS_CHANGED',
      entityType: 'appointment',
      entityId: id,
      appointmentId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'CANCELLED' },
      metadata: { source: 'DELETE' },
      ipAddress,
      userAgent,
    });

    return ok({ id, status: 'CANCELLED' });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : undefined);
  }
}
