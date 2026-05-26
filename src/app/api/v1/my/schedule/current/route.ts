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

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const schedules = await prisma.workingSchedule.findMany({
    where: { specialistId: specialist.id, isActive: true },
  });

  const days: Array<{ date: string; isWorkDay: boolean; startTime: string | null; endTime: string | null }> = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow  = date.getDay();
    const schedule = schedules.find((s) => DOW_MAP[s.dayOfWeek] === dow);
    days.push({
      date:      date.toISOString().slice(0, 10),
      isWorkDay: !!schedule,
      startTime: schedule?.startTime ?? null,
      endTime:   schedule?.endTime ?? null,
    });
  }

  return ok({ month: `${year}-${String(month + 1).padStart(2, '0')}`, days });
}
