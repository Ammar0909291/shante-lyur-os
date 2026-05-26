export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365,
};

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) return err('Forbidden', 403);

  const period = req.nextUrl.searchParams.get('period') ?? '30d';
  const days   = PERIOD_DAYS[period] ?? 30;
  const from   = new Date(Date.now() - days * 86_400_000);
  const to     = new Date();

  const [specialists, appointments] = await Promise.all([
    prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        department: true,
        color: true,
        displayName: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        startAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: {
        specialistId: true,
        clientId: true,
        totalPrice: true,
        status: true,
        startAt: true,
        totalDuration: true,
      },
    }),
  ]);

  const kpi = specialists.map((s) => {
    const appts     = appointments.filter((a) => a.specialistId === s.id);
    const completed = appts.filter((a) => ['COMPLETED'].includes(a.status));
    const revenue   = completed.reduce((sum, a) => sum + Number(a.totalPrice), 0);
    const avgTicket = completed.length > 0 ? revenue / completed.length : 0;
    const avgDuration = appts.length > 0
      ? Math.round(appts.reduce((s, a) => s + a.totalDuration, 0) / appts.length)
      : 0;

    return {
      id:             s.id,
      name:           s.displayName ?? `${s.user.firstName} ${s.user.lastName}`,
      department:     s.department,
      color:          s.color ?? null,
      revenue,
      visits:         appts.length,
      completedVisits: completed.length,
      uniqueClients:  new Set(appts.map((a) => a.clientId)).size,
      avgTicket,
      avgDuration,
    };
  });

  // Sort by revenue desc
  kpi.sort((a, b) => b.revenue - a.revenue);

  return ok({ kpi, period, from: from.toISOString(), to: to.toISOString() });
}
