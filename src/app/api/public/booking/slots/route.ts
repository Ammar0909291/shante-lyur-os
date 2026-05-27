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

const SLOT_INTERVAL_MIN = 30;
const DAY_START_H = 10;
const DAY_END_H   = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const specialistId = searchParams.get('specialistId');
  const date         = searchParams.get('date');        // YYYY-MM-DD
  const durationMin  = parseInt(searchParams.get('duration') ?? '60', 10);

  if (!specialistId || !date) return err('specialistId and date are required');
  if (isNaN(durationMin) || durationMin <= 0) return err('duration must be a positive integer');

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!specialist) return err('Specialist not found', 404);

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd   = new Date(`${date}T23:59:59.999Z`);
  const dow      = dayStart.getUTCDay();
  const monthStr = date.slice(0, 7);

  // Check if specialist works on this day
  const approvedRequest = await prisma.scheduleRequest.findFirst({
    where: { specialistId, month: monthStr, status: 'APPROVED' },
    select: { days: true },
  }) as { days: unknown } | null;

  let isWorkDay = false;
  let workStart = `${String(DAY_START_H).padStart(2, '0')}:00`;
  let workEnd   = `${String(DAY_END_H).padStart(2, '0')}:00`;

  if (approvedRequest) {
    if (Array.isArray(approvedRequest.days)) {
      const dayEntry = (approvedRequest.days as Array<{ date: string; isWorkDay: boolean; startTime?: string; endTime?: string }>)
        .find((d) => d.date === date);
      isWorkDay = dayEntry?.isWorkDay ?? false;
      if (dayEntry?.startTime) workStart = dayEntry.startTime;
      if (dayEntry?.endTime)   workEnd   = dayEntry.endTime;
    }
  } else {
    const schedule = await prisma.workingSchedule.findFirst({
      where: { specialistId, isActive: true },
    });
    const allSchedules = await prisma.workingSchedule.findMany({
      where: { specialistId, isActive: true },
    });
    const match = allSchedules.find((s) => DOW_MAP[s.dayOfWeek] === dow);
    if (match) {
      isWorkDay = true;
      workStart = match.startTime ?? workStart;
      workEnd   = match.endTime ?? workEnd;
    }
    void schedule;
  }

  // Check blocked time / vacation
  const [blocked, vacation] = await Promise.all([
    prisma.blockedTime.findFirst({
      where: {
        specialistId,
        startAt: { lte: dayEnd },
        endAt:   { gte: dayStart },
      },
    }),
    prisma.vacation.findFirst({
      where: {
        specialistId,
        startDate: { lte: dayEnd },
        endDate:   { gte: dayStart },
      },
    }),
  ]);

  if (!isWorkDay || blocked || vacation) {
    return ok({ slots: [], reason: !isWorkDay ? 'not_working' : 'blocked' });
  }

  // Fetch existing appointments for this day
  const existing = await prisma.appointment.findMany({
    where: {
      specialistId,
      startAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { startAt: true, endAt: true },
  });

  // Generate available slots
  const [startH, startM] = workStart.split(':').map(Number);
  const [endH, endM]     = workEnd.split(':').map(Number);
  const dayStartMin = startH * 60 + startM;
  const dayEndMin   = endH   * 60 + endM;

  const slots: string[] = [];
  for (let slotStart = dayStartMin; slotStart + durationMin <= dayEndMin; slotStart += SLOT_INTERVAL_MIN) {
    const slotEnd = slotStart + durationMin;
    const slotStartUtc = new Date(`${date}T${pad(Math.floor(slotStart / 60))}:${pad(slotStart % 60)}:00.000Z`);
    const slotEndUtc   = new Date(`${date}T${pad(Math.floor(slotEnd   / 60))}:${pad(slotEnd   % 60)}:00.000Z`);

    const conflict = existing.some(
      (a) => a.startAt < slotEndUtc && a.endAt > slotStartUtc,
    );
    if (!conflict) {
      slots.push(`${pad(Math.floor(slotStart / 60))}:${pad(slotStart % 60)}`);
    }
  }

  return ok({ slots });
}

function pad(n: number) { return String(n).padStart(2, '0'); }
