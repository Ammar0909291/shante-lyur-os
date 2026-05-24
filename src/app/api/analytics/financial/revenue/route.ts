export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  pct,
  ok,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type {
  FinancialRevenueResponse,
  FinancialCategoryBreakdown,
  FinancialBySpecialistType,
  FinancialDayPoint,
} from '@/types/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateParam(raw: string | null, fallback: Date): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  const d = new Date(raw + 'T00:00:00Z');
  return isNaN(d.getTime()) ? fallback : d;
}

function toNum(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

function localDateStr(date: Date, timezone: string): string {
  return date.toLocaleDateString('sv-SE', { timeZone: timezone });
}

function buildDayPoints(
  apts: { startAt: Date; totalPrice: { toNumber(): number } }[],
  from: Date,
  to: Date,
  timezone: string,
): FinancialDayPoint[] {
  const byDay = new Map<string, { revenue: number; sessionCount: number }>();
  for (const apt of apts) {
    const key = localDateStr(apt.startAt, timezone);
    const prev = byDay.get(key) ?? { revenue: 0, sessionCount: 0 };
    byDay.set(key, { revenue: prev.revenue + apt.totalPrice.toNumber(), sessionCount: prev.sessionCount + 1 });
  }

  const points: FinancialDayPoint[] = [];
  const cursor = new Date(from);
  while (cursor < to) {
    const key = localDateStr(cursor, timezone);
    const entry = byDay.get(key) ?? { revenue: 0, sessionCount: 0 };
    points.push({ date: key, revenue: entry.revenue, sessionCount: entry.sessionCount });
    cursor.setTime(cursor.getTime() + 86_400_000);
  }
  return points;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
  const defaultFrom = new Date(todayStart.getTime() - 29 * 86_400_000);

  const { searchParams } = request.nextUrl;
  const from = parseDateParam(searchParams.get('from'), defaultFrom);
  const to = parseDateParam(searchParams.get('to'), todayEnd);

  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime());

  try {
    const [appointments, prevAggregate] = await Promise.all([
      prisma.appointment.findMany({
        where: { startAt: { gte: from, lt: to }, status: 'COMPLETED' },
        select: {
          totalPrice: true,
          startAt: true,
          specialist: { select: { specialization: true } },
          services: {
            select: {
              price: true,
              service: { select: { category: true } },
            },
          },
        },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: prevFrom, lt: prevTo }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
    ]);

    type AptRow = typeof appointments[number];

    const total = appointments.reduce((s, a) => s + toNum(a.totalPrice), 0);
    const sessionCount = appointments.length;
    const avgTicket = sessionCount > 0 ? total / sessionCount : 0;

    // byCategory — split by AppointmentService prices
    const catMap = new Map<string, { revenue: number; count: number }>();
    for (const apt of appointments as AptRow[]) {
      for (const svc of apt.services) {
        const cat = svc.service.category as string;
        const prev = catMap.get(cat) ?? { revenue: 0, count: 0 };
        catMap.set(cat, { revenue: prev.revenue + toNum(svc.price), count: prev.count + 1 });
      }
    }
    const byCategory: FinancialCategoryBreakdown[] = [...catMap.entries()]
      .map(([category, v]) => ({
        category,
        revenue: v.revenue,
        sessionCount: v.count,
        avgTicket: v.count > 0 ? v.revenue / v.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // bySpecialistType
    const typeMap = new Map<'MASSAGE' | 'COSMETOLOGY', { revenue: number; count: number }>();
    for (const apt of appointments as AptRow[]) {
      const t = deriveSpecialistType(apt.specialist?.specialization);
      const prev = typeMap.get(t) ?? { revenue: 0, count: 0 };
      typeMap.set(t, { revenue: prev.revenue + toNum(apt.totalPrice), count: prev.count + 1 });
    }
    const bySpecialistType: FinancialBySpecialistType[] = (['MASSAGE', 'COSMETOLOGY'] as const).map(t => {
      const v = typeMap.get(t) ?? { revenue: 0, count: 0 };
      return { specialistType: t, revenue: v.revenue, sessionCount: v.count };
    });

    // byDay — zero-filled
    const byDay = buildDayPoints(appointments as AptRow[], from, to, SALON_TIMEZONE);

    // topEarningDay
    let topEarningDay = null;
    if (byDay.length > 0) {
      const top = byDay.reduce((best, d) => (d.revenue > best.revenue ? d : best), byDay[0]);
      topEarningDay = top.revenue > 0 ? { date: top.date, revenue: top.revenue } : null;
    }

    // trend
    const prevTotal = toNum((prevAggregate as { _sum: { totalPrice: { toNumber(): number } | null } })._sum.totalPrice);
    const vsLastPeriod = pct(total, prevTotal);

    const fromStr = localDateStr(from, SALON_TIMEZONE);
    const toStr = localDateStr(new Date(to.getTime() - 1), SALON_TIMEZONE);

    const result: FinancialRevenueResponse = {
      period: { from: fromStr, to: toStr },
      total,
      byCategory,
      bySpecialistType,
      byDay,
      trend: { vsLastPeriod },
      avgTicket,
      topEarningDay,
    };

    return ok<FinancialRevenueResponse>(result);
  } catch (err) {
    console.error('[analytics/financial/revenue] error', err);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue' } },
      { status: 500 },
    );
  }
}
