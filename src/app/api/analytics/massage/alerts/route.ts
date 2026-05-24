export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { type AppointmentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  ok,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type { MassageAlertsResponse, WorkloadAlert, AlertSeverity } from '@/types/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_TARGET = 6.0;
const DAY_END_HOUR = 21;

const ACTIVE_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcWeight(totalDuration: number): number {
  return totalDuration >= 85 ? 1.5 : 1.0;
}

function hoursLeftInDay(timezone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const lh = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
  const lm = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  return Math.max(0, DAY_END_HOUR - lh - lm / 60);
}

function determineSeverity(
  sessionWeight: number,
  hoursLeft: number,
  overridden: boolean,
): AlertSeverity {
  if (overridden) return 'info';
  if (sessionWeight < 3 && hoursLeft < 4) return 'critical';
  return 'warning';
}

function buildMessage(
  name: string,
  severity: AlertSeverity,
  remaining: number,
): { ru: string; en: string } {
  if (severity === 'info') {
    return {
      ru: `${name}: норма снята администратором`,
      en: `${name}: target overridden by admin`,
    };
  }
  if (severity === 'critical') {
    return {
      ru: `${name}: критически мало сеансов (осталось ${remaining.toFixed(1)} ед.)`,
      en: `${name}: critically low sessions (${remaining.toFixed(1)} units remaining)`,
    };
  }
  return {
    ru: `${name}: не выполнена норма (осталось ${remaining.toFixed(1)} ед.)`,
    en: `${name}: below target (${remaining.toFixed(1)} units remaining)`,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
  const hoursLeft = hoursLeftInDay(SALON_TIMEZONE);

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
      const response: MassageAlertsResponse = {
        generatedAt: new Date().toISOString(),
        alerts: [],
        totalAlerts: 0,
        criticalCount: 0,
      };
      return ok<MassageAlertsResponse>(response);
    }

    const ids = massageSpecialists.map(s => s.id);

    const [appointments, overrides] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          specialistId: { in: ids },
          startAt: { gte: todayStart, lt: todayEnd },
          status: { in: ACTIVE_STATUSES },
        },
        select: { specialistId: true, totalDuration: true },
      }),
      prisma.workloadOverride.findMany({
        where: { specialistId: { in: ids }, date: todayStart },
        select: { specialistId: true, reason: true },
      }),
    ]);

    type AptRow = { specialistId: string; totalDuration: number };
    const weightBySpec = new Map<string, number>();
    for (const apt of appointments as AptRow[]) {
      weightBySpec.set(
        apt.specialistId,
        (weightBySpec.get(apt.specialistId) ?? 0) + calcWeight(apt.totalDuration),
      );
    }

    const overrideMap = new Set(
      (overrides as { specialistId: string }[]).map(o => o.specialistId),
    );

    const alerts: WorkloadAlert[] = [];

    for (const s of massageSpecialists) {
      const sessionWeight = weightBySpec.get(s.id) ?? 0;
      if (sessionWeight >= DAILY_TARGET) continue; // target met — no alert

      const isOverridden = overrideMap.has(s.id);
      const remainingToTarget = Math.max(0, DAILY_TARGET - sessionWeight);
      const severity = determineSeverity(sessionWeight, hoursLeft, isOverridden);
      const name = `${s.user.firstName} ${s.user.lastName}`;

      alerts.push({
        specialistId: s.id,
        specialistName: name,
        severity,
        sessionWeight,
        remainingToTarget,
        hoursLeftInDay: hoursLeft,
        overridden: isOverridden,
        message: buildMessage(name, severity, remainingToTarget),
      });
    }

    // totalAlerts excludes overridden specialists (info severity)
    const totalAlerts = alerts.filter(a => !a.overridden).length;
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    const response: MassageAlertsResponse = {
      generatedAt: new Date().toISOString(),
      alerts,
      totalAlerts,
      criticalCount,
    };

    return ok<MassageAlertsResponse>(response);
  } catch (err) {
    console.error('[analytics/massage/alerts] error', err);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch alerts' } },
      { status: 500 },
    );
  }
}
