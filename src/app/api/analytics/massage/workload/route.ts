export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { type AppointmentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  getDateBounds,
  ok,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type { MassageWorkloadSummary, MassageSpecialistWorkload } from '@/types/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_TARGET = 6.0;
const DAY_END_HOUR = 21; // 21:00 salon local time

// Statuses that count toward workload (not cancelled/no-show/rescheduled)
const ACTIVE_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcWeight(totalDuration: number): number {
  return totalDuration >= 85 ? 1.5 : 1.0;
}

function hoursLeftInDay(timezone: string): number {
  const now = new Date();
  const localHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .find(p => p.type === 'hour')?.value ?? '0',
  );
  const localMinute = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      minute: '2-digit',
    })
      .formatToParts(now)
      .find(p => p.type === 'minute')?.value ?? '0',
  );
  const elapsed = localHour + localMinute / 60;
  return Math.max(0, DAY_END_HOUR - elapsed);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get('date');

  let dateStr: string;
  let start: Date;
  let end: Date;

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    dateStr = dateParam;
    const bounds = getDateBounds(dateStr, SALON_TIMEZONE);
    start = bounds.start;
    end = bounds.end;
  } else {
    const bounds = getTodayBounds(SALON_TIMEZONE);
    start = bounds.todayStart;
    end = bounds.todayEnd;
    dateStr = start.toLocaleDateString('sv-SE', { timeZone: SALON_TIMEZONE });
  }

  const hoursLeft = hoursLeftInDay(SALON_TIMEZONE);
  const now = new Date();

  try {
    const specialists = await prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const massageSpecialists = specialists.filter(
      s => deriveSpecialistType(s.specialization) === 'MASSAGE',
    );

    if (massageSpecialists.length === 0) {
      const result: MassageWorkloadSummary = {
        date: dateStr,
        summary: {
          totalMassageSpecialists: 0,
          workingToday: 0,
          meetingTarget: 0,
          belowTarget: 0,
          overridden: 0,
        },
        specialists: [],
      };
      return ok<MassageWorkloadSummary>(result);
    }

    const ids = massageSpecialists.map(s => s.id);

    const [appointments, overrides] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          specialistId: { in: ids },
          startAt: { gte: start, lt: end },
          status: { in: ACTIVE_STATUSES },
        },
        select: {
          specialistId: true,
          totalDuration: true,
          startAt: true,
          status: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      prisma.workloadOverride.findMany({
        where: {
          specialistId: { in: ids },
          date: start,
        },
        select: {
          specialistId: true,
          reason: true,
        },
      }),
    ]);

    // Build per-specialist lookup maps
    type AptRow = { specialistId: string; totalDuration: number; startAt: Date; status: string };
    const aptsBySpec = new Map<string, AptRow[]>();
    for (const apt of appointments as AptRow[]) {
      const arr = aptsBySpec.get(apt.specialistId) ?? [];
      arr.push(apt);
      aptsBySpec.set(apt.specialistId, arr);
    }

    const overrideMap = new Map<string, string | null>();
    for (const ov of overrides as { specialistId: string; reason: string | null }[]) {
      overrideMap.set(ov.specialistId, ov.reason);
    }

    let meetingTarget = 0;
    let belowTarget = 0;
    let overriddenCount = 0;
    let workingToday = 0;

    const specialistRows: MassageSpecialistWorkload[] = massageSpecialists.map(s => {
      const apts = aptsBySpec.get(s.id) ?? [];
      const sessionsToday = apts.length;
      const sessionWeight = apts.reduce((sum, a) => sum + calcWeight(a.totalDuration), 0);
      const targetMet = sessionWeight >= DAILY_TARGET;
      const isOverridden = overrideMap.has(s.id);
      const overrideReason = isOverridden ? (overrideMap.get(s.id) ?? null) : null;
      const remainingToTarget = Math.max(0, DAILY_TARGET - sessionWeight);

      if (sessionsToday > 0) workingToday++;
      if (targetMet) meetingTarget++;
      else belowTarget++;
      if (isOverridden) overriddenCount++;

      // Next upcoming appointment (after now, on this date)
      const upcoming = apts.filter(
        a => a.startAt > now && (a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'),
      );
      const nextAppointment = upcoming.length > 0 ? upcoming[0].startAt.toISOString() : null;

      // Scheduling recommendation
      const schedulingRecommendation =
        remainingToTarget > 0 && hoursLeft > 2 && !isOverridden
          ? `Рекомендуется добавить ${Math.ceil(remainingToTarget)} сеансов для ${s.user.firstName} ${s.user.lastName}`
          : null;

      return {
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        sessionsToday,
        sessionWeight,
        targetMet,
        overridden: isOverridden,
        overrideReason,
        remainingToTarget,
        nextAppointment,
        schedulingRecommendation,
      };
    });

    const result: MassageWorkloadSummary = {
      date: dateStr,
      summary: {
        totalMassageSpecialists: massageSpecialists.length,
        workingToday,
        meetingTarget,
        belowTarget,
        overridden: overriddenCount,
      },
      specialists: specialistRows,
    };

    return ok<MassageWorkloadSummary>(result);
  } catch (err) {
    console.error('[analytics/massage/workload] error', err);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch workload' } },
      { status: 500 },
    );
  }
}
