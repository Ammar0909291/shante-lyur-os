export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { departmentToSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  pct,
  ok,
  apiError,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type { SpecialistPerformanceSummary } from '@/types/analytics';

// ─── Date range helpers ───────────────────────────────────────────────────────

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

function get30DayBounds(): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
  const from = new Date(todayStart.getTime() - 29 * 86_400_000);
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(prevTo.getTime() - 30 * 86_400_000);
  return { from, to: todayEnd, prevFrom, prevTo };
}

// ─── Workload compliance: working days vs compliant days ─────────────────────

function calcCompliance(
  specialistType: 'MASSAGE' | 'COSMETOLOGY',
  appointments: { startAt: Date; totalDuration: number; status: string }[],
  timezone: string,
): number | null {
  if (specialistType === 'COSMETOLOGY') return null;

  const COMPLETED = 'COMPLETED';
  const TARGET_MINUTES = 360;

  // Group by local date string
  const byDay = new Map<string, number>();
  for (const apt of appointments) {
    if (apt.status !== COMPLETED) continue;
    const dayKey = apt.startAt.toLocaleDateString('sv-SE', { timeZone: timezone });
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + apt.totalDuration);
  }

  if (byDay.size === 0) return 0;

  let compliant = 0;
  for (const total of byDay.values()) {
    if (total >= TARGET_MINUTES) compliant++;
  }

  return Math.round((compliant / byDay.size) * 100);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { searchParams } = request.nextUrl;
  const typeFilter = searchParams.get('type'); // 'MASSAGE' | 'COSMETOLOGY' | null

  const bounds = get30DayBounds();
  const from = parseDateParam(searchParams.get('from'), bounds.from);
  const to = parseDateParam(searchParams.get('to'), bounds.to);

  // Previous period of equal length for trend calculation
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime());

  try {
    // Fetch all active specialists with user info
    const specialists = await prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        specialization: true,
        department: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // Filter by type if requested — support both department-based and legacy specialistType filter
    const filtered = specialists.filter(s => {
      const t = departmentToSpecialistType(s.department ?? 'COSMETOLOGY');
      return !typeFilter || t === typeFilter;
    });

    if (filtered.length === 0) {
      return ok<SpecialistPerformanceSummary[]>([]);
    }

    const ids = filtered.map(s => s.id);

    // Current period appointments (COMPLETED only for revenue/sessions)
    const currentApts = await prisma.appointment.findMany({
      where: {
        specialistId: { in: ids },
        startAt: { gte: from, lt: to },
        status: 'COMPLETED',
      },
      select: {
        specialistId: true,
        clientId: true,
        totalPrice: true,
        totalDuration: true,
        startAt: true,
        status: true,
      },
    });

    // Previous period appointments for trend
    const prevApts = await prisma.appointment.findMany({
      where: {
        specialistId: { in: ids },
        startAt: { gte: prevFrom, lt: prevTo },
        status: 'COMPLETED',
      },
      select: {
        specialistId: true,
        totalPrice: true,
      },
    });

    // Build lookup maps
    type AptRow = { specialistId: string; clientId: string; totalPrice: { toNumber(): number }; totalDuration: number; startAt: Date; status: string };
    const currentBySpec = new Map<string, AptRow[]>();
    for (const apt of currentApts as AptRow[]) {
      const arr = currentBySpec.get(apt.specialistId) ?? [];
      arr.push(apt);
      currentBySpec.set(apt.specialistId, arr);
    }

    const prevRevenueBySpec = new Map<string, number>();
    for (const apt of prevApts as { specialistId: string; totalPrice: { toNumber(): number } }[]) {
      prevRevenueBySpec.set(
        apt.specialistId,
        (prevRevenueBySpec.get(apt.specialistId) ?? 0) + apt.totalPrice.toNumber(),
      );
    }

    const results: SpecialistPerformanceSummary[] = filtered.map(s => {
      const specialistType = departmentToSpecialistType(s.department ?? 'COSMETOLOGY');
      const apts = currentBySpec.get(s.id) ?? [];

      const totalSessions = apts.length;
      const revenueGenerated = apts.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0);
      const avgSessionDuration =
        totalSessions > 0
          ? Math.round(apts.reduce((sum, a) => sum + a.totalDuration, 0) / totalSessions)
          : 0;

      const uniqueClients = new Set(apts.map(a => a.clientId));
      const repeatClients = [...uniqueClients].filter(
        cid => apts.filter(a => a.clientId === cid).length >= 2,
      ).length;
      const clientRetentionRate =
        uniqueClients.size > 0 ? Math.round((repeatClients / uniqueClients.size) * 100) : 0;

      const prevRevenue = prevRevenueBySpec.get(s.id) ?? 0;
      const trendVsLastMonth = pct(revenueGenerated, prevRevenue);

      const workloadCompliance = calcCompliance(specialistType, apts, SALON_TIMEZONE);

      return {
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        specialistType,
        totalSessions,
        revenueGenerated,
        avgSessionDuration,
        clientRetentionRate,
        workloadCompliance,
        trendVsLastMonth,
      };
    });

    return ok<SpecialistPerformanceSummary[]>(results);
  } catch (err) {
    console.error('[analytics/specialists] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch specialist analytics', 500);
  }
}
