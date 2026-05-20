export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

const PatchSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

// Valid transitions map
const TRANSITIONS: Record<string, string[]> = {
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};

function computeLoyaltyTier(visits: number, spent: number): string {
  if (visits >= 50 || spent >= 100_000) return 'VIP';
  if (visits >= 25 || spent >= 50_000)  return 'PLATINUM';
  if (visits >= 10 || spent >= 20_000)  return 'GOLD';
  if (visits >= 3  || spent >= 5_000)   return 'SILVER';
  return 'BRONZE';
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

  const { randomUUID } = await import('crypto');
  await prisma.customerProfile.upsert({
    where:  { userId: clientId },
    create: {
      id: randomUUID(),
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
      // Only set firstVisitAt if the profile doesn't already have one
      ...(firstAppt ? { firstVisitAt: firstAppt.startAt } : {}),
    },
  });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
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

    if (!appointment) return apiError('NOT_FOUND', 'Appointment not found', 404);
    return ok(appointment);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const { status: newStatus } = parsed.data;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, clientId: true },
    });
    if (!existing) return apiError('NOT_FOUND', 'Appointment not found', 404);

    const allowed = TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return apiError(
        'INVALID_TRANSITION',
        `Cannot change status from ${existing.status} to ${newStatus}`,
        422,
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data:  { status: newStatus },
      select: { id: true, status: true, clientId: true, startAt: true, endAt: true, totalPrice: true },
    });

    // Sync client stats whenever appointment reaches a terminal or important state
    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED' || newStatus === 'NO_SHOW') {
      await syncClientProfile(existing.clientId);
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, clientId: true },
    });
    if (!existing) return apiError('NOT_FOUND', 'Appointment not found', 404);

    if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
      return apiError('INVALID_TRANSITION', 'Cannot cancel a completed or already-cancelled appointment', 422);
    }

    await prisma.appointment.update({
      where: { id },
      data:  { status: 'CANCELLED' },
    });

    await syncClientProfile(existing.clientId);

    return ok({ id, status: 'CANCELLED' });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
