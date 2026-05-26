export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const DOW_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');
  if (!from || !to) return err('from and to are required');

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const fromDate = new Date(from);
  const toDate   = new Date(to + 'T23:59:59.999Z');

  const [schedules, blocked, vacations, appointments] = await Promise.all([
    prisma.workingSchedule.findMany({
      where: { specialistId: specialist.id, isActive: true },
    }),
    prisma.blockedTime.findMany({
      where: {
        specialistId: specialist.id,
        startAt: { lte: toDate },
        endAt:   { gte: fromDate },
      },
    }),
    prisma.vacation.findMany({
      where: {
        specialistId: specialist.id,
        startDate: { lte: toDate },
        endDate:   { gte: fromDate },
      },
    }),
    prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        startAt: { gte: fromDate, lte: toDate },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      select: { startAt: true, endAt: true, status: true },
    }),
  ]);

  // Build day-by-day map
  const days: Array<{
    date: string;
    isWorkDay: boolean;
    startTime: string | null;
    endTime: string | null;
    isBlocked: boolean;
    isVacation: boolean;
    appointmentCount: number;
  }> = [];

  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const dow = cursor.getDay(); // 0=Sun

    const schedule = schedules.find((s) => DOW_MAP[s.dayOfWeek] === dow);
    const isBlocked = blocked.some(
      (b) => b.startAt <= cursor && b.endAt >= new Date(cursor.getTime() + 86399999),
    );
    const isVacation = vacations.some(
      (v) => v.startDate <= cursor && v.endDate >= cursor,
    );

    const dayAppts = appointments.filter((a) => a.startAt.toISOString().slice(0, 10) === dateStr);

    days.push({
      date:             dateStr,
      isWorkDay:        !!schedule && !isBlocked && !isVacation,
      startTime:        schedule?.startTime ?? null,
      endTime:          schedule?.endTime ?? null,
      isBlocked,
      isVacation,
      appointmentCount: dayAppts.length,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return ok({ days });
}
