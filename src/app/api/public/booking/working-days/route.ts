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
  const { searchParams } = req.nextUrl;
  const specialistId = searchParams.get('specialistId');
  const from         = searchParams.get('from');
  const to           = searchParams.get('to');

  if (!specialistId || !from || !to) return err('specialistId, from, and to are required');

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!specialist) return err('Specialist not found', 404);

  const fromDate = new Date(from);
  const toDate   = new Date(to + 'T23:59:59.999Z');

  const monthsInRange = new Set<string>();
  const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  while (cur <= toDate) {
    monthsInRange.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }

  const approvedRequests = await (prisma as any).scheduleRequest.findMany({
    where: {
      specialistId: specialist.id,
      month: { in: [...monthsInRange] },
      status: 'APPROVED',
    },
    select: { month: true, days: true },
  }) as Array<{ month: string; days: unknown }>;

  const approvedWorkDays = new Map<string, Set<string>>();
  const approvedMonths   = new Set<string>();
  for (const r of approvedRequests) {
    approvedMonths.add(r.month);
    const workSet = new Set<string>();
    if (Array.isArray(r.days)) {
      for (const d of r.days as RequestDay[]) {
        if (d.isWorkDay) workSet.add(d.date);
      }
    }
    approvedWorkDays.set(r.month, workSet);
  }

  const [schedules, blocked, vacations] = await Promise.all([
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
  ]);

  const workDays: string[] = [];
  const cursor = new Date(fromDate);

  while (cursor <= toDate) {
    const dateStr  = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const monthStr = dateStr.slice(0, 7);
    const dow      = cursor.getDay();

    const isBlocked  = blocked.some((b) => b.startAt <= cursor && b.endAt >= new Date(cursor.getTime() + 86399999));
    const isVacation = vacations.some((v) => v.startDate <= cursor && v.endDate >= cursor);

    let isWorkDay: boolean;
    if (approvedMonths.has(monthStr)) {
      isWorkDay = (approvedWorkDays.get(monthStr)?.has(dateStr) ?? false) && !isBlocked && !isVacation;
    } else {
      const schedule = schedules.find((s) => DOW_MAP[s.dayOfWeek] === dow);
      isWorkDay = !!schedule && !isBlocked && !isVacation;
    }

    if (isWorkDay) workDays.push(dateStr);
    cursor.setDate(cursor.getDate() + 1);
  }

  return ok({ workDays });
}
