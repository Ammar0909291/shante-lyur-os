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
    select: { id: true, department: true, showEarningsToSpecialist: true, dailyTargetSessions: true },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const now = new Date();

  // Week bounds (Mon–Sun of current week)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const weekEnd   = new Date(weekStart.getTime() + 7 * 86400000);

  // Month bounds
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [weekApts, monthApts] = await Promise.all([
    prisma.appointment.findMany({
      where: { specialistId: specialist.id, startAt: { gte: weekStart, lt: weekEnd } },
      select: { status: true, totalPrice: true, clientId: true },
    }),
    prisma.appointment.findMany({
      where: { specialistId: specialist.id, startAt: { gte: monthStart, lt: monthEnd } },
      select: {
        status: true,
        totalPrice: true,
        clientId: true,
        services: { select: { serviceId: true, service: { select: { name: true } } } },
      },
    }),
  ]);

  // Week stats
  const weekCompleted  = weekApts.filter((a) => a.status === 'COMPLETED').length;
  const weekCancelled  = weekApts.filter((a) => a.status === 'CANCELLED').length;
  const weekNoShows    = weekApts.filter((a) => a.status === 'NO_SHOW').length;
  const weekWorkedDays = Math.max(1, dayOfWeek + 1);
  const weekWorkloadPct = specialist.department === 'MASSAGE'
    ? Math.round((weekCompleted / (specialist.dailyTargetSessions * weekWorkedDays)) * 100)
    : null;

  // Month stats
  const monthCompleted = monthApts.filter((a) => a.status === 'COMPLETED').length;
  const monthRevenue   = monthApts
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + Number(a.totalPrice), 0);

  // Most booked service
  const serviceCount: Record<string, { name: string; count: number }> = {};
  for (const a of monthApts.filter((a) => a.status === 'COMPLETED')) {
    for (const s of a.services) {
      if (!serviceCount[s.serviceId]) serviceCount[s.serviceId] = { name: s.service.name, count: 0 };
      serviceCount[s.serviceId].count++;
    }
  }
  const topService = Object.values(serviceCount).sort((a, b) => b.count - a.count)[0] ?? null;

  // Repeat client rate (clients with > 1 completed session this month)
  const clientSessions: Record<string, number> = {};
  for (const a of monthApts.filter((a) => a.status === 'COMPLETED')) {
    clientSessions[a.clientId] = (clientSessions[a.clientId] ?? 0) + 1;
  }
  const repeatClients = Object.values(clientSessions).filter((n) => n > 1).length;
  const totalClients  = Object.keys(clientSessions).length;
  const repeatRate    = totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0;

  return ok({
    week: {
      completed: weekCompleted,
      cancelled: weekCancelled,
      noShows: weekNoShows,
      workloadPct: weekWorkloadPct,
    },
    month: {
      completed: monthCompleted,
      topService: topService?.name ?? null,
      repeatRate,
      earnings: specialist.showEarningsToSpecialist ? Math.round(monthRevenue) : null,
    },
    showEarnings: specialist.showEarningsToSpecialist,
    isMassage: specialist.department === 'MASSAGE',
    dailyTarget: specialist.dailyTargetSessions,
  });
}
