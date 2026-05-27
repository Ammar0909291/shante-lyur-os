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

interface RequestDay { date: string; isWorkDay: boolean }

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

  // Determine which YYYY-MM values are covered by the requested range
  const monthsInRange = new Set<string>();
  const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  while (cur <= toDate) {
    monthsInRange.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }

  // Fetch approved schedule requests for those months
  const approvedRequests = await prisma.scheduleRequest.findMany({
    where: {
      specialistId: specialist.id,
      month: { in: [...monthsInRange] },
      status: 'APPROVED',
    },
    select: { month: true, days: true },
  }) as Array<{ month: string; days: unknown }>;

  // Build map: month → Set of approved work-day date strings
  const approvedWorkDays = new Map<string, Set<string>>();
  const approvedMonths   = new Set<string>();
  for (const req of approvedRequests) {
    approvedMonths.add(req.month);
    const workSet = new Set<string>();
    if (Array.isArray(req.days)) {
      for (const d of req.days as RequestDay[]) {
        if (d.isWorkDay) workSet.add(d.date);
      }
    }
    approvedWorkDays.set(req.month, workSet);
  }

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
      select: { startAt: true },
    }),
  ]);

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
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const monthStr = dateStr.slice(0, 7);
    const dow = cursor.getDay();

    const isBlocked = blocked.some(
      (b) => b.startAt <= cursor && b.endAt >= new Date(cursor.getTime() + 86399999),
    );
    const isVacation = vacations.some(
      (v) => v.startDate <= cursor && v.endDate >= cursor,
    );

    let isWorkDay: boolean;
    let startTime: string | null = '10:00';
    let endTime:   string | null = '20:00';

    if (approvedMonths.has(monthStr)) {
      // Use approved schedule request for this month
      const workSet = approvedWorkDays.get(monthStr);
      isWorkDay = (workSet?.has(dateStr) ?? false) && !isBlocked && !isVacation;
    } else {
      // Fall back to weekly WorkingSchedule pattern
      const schedule = schedules.find((s) => DOW_MAP[s.dayOfWeek] === dow);
      isWorkDay  = !!schedule && !isBlocked && !isVacation;
      startTime  = schedule?.startTime ?? null;
      endTime    = schedule?.endTime   ?? null;
    }

    const dayAppts = appointments.filter(
      (a) => a.startAt.toISOString().slice(0, 10) === dateStr,
    );

    days.push({
      date:             dateStr,
      isWorkDay,
      startTime:        isWorkDay ? startTime : null,
      endTime:          isWorkDay ? endTime   : null,
      isBlocked,
      isVacation,
      appointmentCount: dayAppts.length,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return ok({ days });
}
