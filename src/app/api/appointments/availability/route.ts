export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { DateRange } from '@/domain/value-objects';
import { AppointmentStatus } from '@/domain/enums';
import { getDayOfWeekInTz, localTimeToUtc, getSalonTz } from '@/lib/timezone';
import type { DayOfWeek } from '@/domain/enums';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// 15-minute grid within working hours
const INTERVAL = 15;

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const p = req.nextUrl.searchParams;
    const specialistId = p.get('specialistId');
    const locationId   = p.get('locationId');
    const dateStr      = p.get('date');      // YYYY-MM-DD in salon local time
    const duration     = Math.max(15, parseInt(p.get('duration') ?? '60', 10));

    if (!specialistId || !locationId || !dateStr) {
      return apiError('VALIDATION_ERROR', 'specialistId, locationId, and date are required', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return apiError('VALIDATION_ERROR', 'date must be YYYY-MM-DD', 400);
    }

    const tz = getSalonTz();

    // Use noon UTC to get the correct local day — avoids midnight DST edge cases
    const dateNoon = new Date(`${dateStr}T12:00:00.000Z`);
    const dayOfWeek = getDayOfWeekInTz(dateNoon, tz) as DayOfWeek;

    const registry = DIRegistry.instance;

    // 1. Get working schedule
    const schedules = await registry.workingScheduleRepository.findBySpecialistAndDay(
      specialistId, dayOfWeek, dateNoon
    );
    const activeSchedule = schedules.find(s => s.isActive && s.isValidForDate(dateNoon));

    if (!activeSchedule) {
      return ok({ slots: [], workingHours: null, date: dateStr, reason: 'NO_SCHEDULE' });
    }

    // 2. Check vacation
    const vacations = await registry.vacationRepository.findActiveVacations(specialistId, dateNoon);
    if (vacations.length > 0) {
      return ok({ slots: [], workingHours: null, date: dateStr, reason: 'VACATION' });
    }

    // 3. Fetch the full day's blocked times and appointments in one pass
    const dayStart = localTimeToUtc(dateStr, '00:00', tz);
    const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60_000);
    const dayRange = DateRange.create(dayStart, dayEnd);

    const [blockedTimes, { items: existingAppts }] = await Promise.all([
      registry.blockedTimeRepository.findOverlapping(specialistId, dayRange),
      registry.appointmentRepository.findMany({
        specialistId,
        from: dayStart,
        to: dayEnd,
        limit: 200,
      }),
    ]);

    const activeAppts = existingAppts.filter(
      a => ![AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW].includes(a.status as AppointmentStatus)
    );

    const workStart = activeSchedule.startMinutes;
    const workEnd   = activeSchedule.endMinutes;
    const brkStart  = activeSchedule.breakStartMinutes;
    const brkEnd    = activeSchedule.breakEndMinutes;

    // 30-min lead time minimum
    const minBookAt = new Date(Date.now() + 30 * 60_000);

    const slots: Array<{ startAt: string; label: string }> = [];

    for (let min = workStart; min + duration <= workEnd; min += INTERVAL) {
      const slotEndMin = min + duration;

      // Skip if slot falls in break window
      if (brkStart !== undefined && brkEnd !== undefined) {
        if (min < brkEnd && slotEndMin > brkStart) continue;
      }

      const slotHH = String(Math.floor(min / 60)).padStart(2, '0');
      const slotMM = String(min % 60).padStart(2, '0');
      const label  = `${slotHH}:${slotMM}`;

      const slotStart = localTimeToUtc(dateStr, label, tz);
      const slotEnd   = new Date(slotStart.getTime() + duration * 60_000);

      // Enforce lead time
      if (slotStart < minBookAt) continue;

      // Check against blocked times
      const slotRange = DateRange.create(slotStart, slotEnd);
      if (blockedTimes.some(bt => bt.timeRange.overlaps(slotRange))) continue;

      // Check against existing appointments
      if (activeAppts.some(a => a.startAt < slotEnd && a.endAt > slotStart)) continue;

      slots.push({ startAt: slotStart.toISOString(), label });
    }

    return ok({
      slots,
      workingHours: { start: activeSchedule.startTime, end: activeSchedule.endTime },
      date: dateStr,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
