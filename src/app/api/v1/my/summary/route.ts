export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const specialist = await prisma.specialist.findUnique({
    where: { userId },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, role: true } } },
  });
  if (!specialist) return err('Specialist not found', 404);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [completedCount, upcomingBooking, payrollPeriod] = await Promise.all([
    prisma.appointment.count({
      where: {
        specialistId: specialist.id,
        startAt: { gte: monthStart, lte: monthEnd },
        status: 'COMPLETED',
      },
    }),
    prisma.appointment.findFirst({
      where: {
        specialistId: specialist.id,
        startAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        services: { include: { service: { select: { name: true } } } },
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.payrollPeriod.findFirst({
      where: {
        specialistId: specialist.id,
        periodStart: { gte: monthStart },
        periodEnd:   { lte: monthEnd },
      },
      select: { totalPayable: true, totalCommission: true, status: true },
    }),
  ]);

  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduleRequest = await (prisma as any).scheduleRequest.findUnique({
    where: { specialistId_month: { specialistId: specialist.id, month: monthStr } },
    select: { status: true, submittedAt: true },
  });

  return ok({
    specialist: {
      id:          specialist.id,
      displayName: specialist.displayName ?? `${specialist.user.firstName} ${specialist.user.lastName}`.trim(),
      avatarUrl:   specialist.user.avatarUrl ?? null,
      role:        specialist.user.role,
      department:  specialist.department,
    },
    currentMonth: {
      completedAppointments: completedCount,
      totalCommission:       Number(payrollPeriod?.totalCommission ?? 0),
      totalPayable:          Number(payrollPeriod?.totalPayable ?? 0),
      payrollStatus:         payrollPeriod?.status ?? null,
    },
    nextBooking: upcomingBooking
      ? {
          id:        upcomingBooking.id,
          startAt:   upcomingBooking.startAt,
          endAt:     upcomingBooking.endAt,
          client:    `${upcomingBooking.client.firstName} ${upcomingBooking.client.lastName}`.trim(),
          services:  upcomingBooking.services.map((s) => s.service.name).join(', '),
          status:    upcomingBooking.status,
        }
      : null,
    scheduleRequest: scheduleRequest ?? null,
  });
}
