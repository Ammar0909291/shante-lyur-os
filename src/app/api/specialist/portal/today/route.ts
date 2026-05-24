export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({
    where: { userId },
    select: { id: true, department: true },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86400000);

  const appointments = await prisma.appointment.findMany({
    where: {
      specialistId: specialist.id,
      startAt: { gte: todayStart, lt: todayEnd },
      status: { notIn: ['CANCELLED'] },
    },
    orderBy: { startAt: 'asc' },
    include: {
      room:     { select: { name: true, type: true } },
      client:   { select: { firstName: true, lastName: true, customerProfile: { select: { loyaltyTier: true, notes: true } } } },
      services: { select: { service: { select: { name: true, baseDuration: true } }, price: true } },
    },
  });

  const slots = appointments.map((a) => {
    const firstName   = a.client?.firstName ?? '—';
    const lastInitial = a.client?.lastName ? a.client.lastName[0] + '.' : '';
    const profile     = a.client?.customerProfile;
    return {
      id: a.id,
      status: a.status,
      startAt: a.startAt.toISOString(),
      endAt:   a.endAt.toISOString(),
      notes:   a.notes,
      room:    a.room ? { name: a.room.name, type: a.room.type } : null,
      client: {
        displayName: `${firstName} ${lastInitial}`.trim(),
        isVip:        profile?.loyaltyTier === 'VIP',
        serviceNotes: profile?.notes ?? null,
        allergies:    [] as string[],
      },
      services: a.services.map((s) => ({
        name:     s.service.name,
        duration: s.service.baseDuration,
        price:    Number(s.price),
      })),
    };
  });

  // Workload tracker for massage specialists (dailyTarget default until schema field added)
  const dailyTarget    = 8;
  const completedToday = slots.filter((s) => s.status === 'COMPLETED').length;
  const workload       = specialist.department === 'MASSAGE'
    ? { target: dailyTarget, completed: completedToday, remaining: Math.max(0, dailyTarget - completedToday) }
    : null;

  return ok({ slots, workload, specialistId: specialist.id });
}
