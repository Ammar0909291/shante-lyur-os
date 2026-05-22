export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function r2(n: number) { return Math.round(n * 100) / 100; }

function stddev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ─── GET /api/executive/forecast ─────────────────────────────────────────────
// Builds revenue forecast + demand by day-of-week using last 90 days of data.
// Query: ?horizon=7|14|30 (forecast horizon, default 14)

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const horizon = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('horizon') ?? '14')));
  const now     = new Date();
  const from90  = new Date(now.getTime() - 90 * 86_400_000);

  console.log('[executive/forecast]', { horizon });

  try {
    const appointments = await prisma.appointment.findMany({
      where: { startAt: { gte: from90, lte: now }, status: 'COMPLETED' },
      select: { startAt: true, totalPrice: true, totalDuration: true,
                services: { select: { service: { select: { category: true } } } } },
    });

    // ── Build day-level historical series ────────────────────────────────────
    const dayMap = new Map<string, { revenue: number; count: number; dow: number }>();
    for (const apt of appointments) {
      const day = apt.startAt.toISOString().split('T')[0];
      const dow = apt.startAt.getUTCDay(); // 0=Sun
      const ex  = dayMap.get(day);
      if (ex) { ex.revenue += Number(apt.totalPrice); ex.count++; }
      else dayMap.set(day, { revenue: Number(apt.totalPrice), count: 1, dow });
    }

    const historicalDays: { date: string; revenue: number; count: number }[] = [];
    const cur = new Date(from90);
    while (cur <= now) {
      const d   = cur.toISOString().split('T')[0];
      const entry = dayMap.get(d) ?? { revenue: 0, count: 0, dow: cur.getUTCDay() };
      historicalDays.push({ date: d, revenue: r2(entry.revenue), count: entry.count });
      cur.setTime(cur.getTime() + 86_400_000);
    }

    // ── Day-of-week patterns ──────────────────────────────────────────────────
    const dowRevenue: number[][] = [[], [], [], [], [], [], []];
    for (const [, v] of dayMap) dowRevenue[v.dow].push(v.revenue);
    const dowAvg = dowRevenue.map(arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const globalAvg = dowAvg.reduce((s, v) => s + v, 0) / 7;

    // ── Rolling 14-day average for base forecast ──────────────────────────────
    const last14 = historicalDays.slice(-14);
    const last7  = historicalDays.slice(-7);
    const rolling14Avg = last14.length > 0
      ? last14.reduce((s, d) => s + d.revenue, 0) / last14.length : 0;
    const last7Avg = last7.length > 0
      ? last7.reduce((s, d) => s + d.revenue, 0) / last7.length : 0;

    // Trend factor: last 7 vs prior 7
    const prior7 = historicalDays.slice(-14, -7);
    const prior7Avg = prior7.length > 0 ? prior7.reduce((s, d) => s + d.revenue, 0) / prior7.length : 0;
    const weeklyTrendFactor = prior7Avg > 0 ? last7Avg / prior7Avg : 1.0;
    // Clamp trend to ±20% per forecast
    const clampedTrend = Math.max(0.8, Math.min(1.2, weeklyTrendFactor));

    // Coefficient of variation → confidence
    const revenueValues = historicalDays.filter(d => d.revenue > 0).map(d => d.revenue);
    const cv = revenueValues.length > 0 ? stddev(revenueValues) / (rolling14Avg || 1) : 1;
    const confidence: 'high' | 'medium' | 'low' = cv < 0.3 ? 'high' : cv < 0.6 ? 'medium' : 'low';

    // ── Forecast horizon ───────────────────────────────────────────────────────
    const forecastStart = new Date(now);
    forecastStart.setUTCDate(forecastStart.getUTCDate() + 1);
    const forecast: { date: string; forecastRevenue: number; low: number; high: number; confidence: string; forecastCount: number }[] = [];

    for (let i = 0; i < horizon; i++) {
      const fd  = new Date(forecastStart.getTime() + i * 86_400_000);
      const fds = fd.toISOString().split('T')[0];
      const dow = fd.getUTCDay();
      // Blend rolling avg with day-of-week pattern
      const dowFactor = globalAvg > 0 ? dowAvg[dow] / globalAvg : 1;
      const base  = rolling14Avg * clampedTrend * Math.max(0.5, Math.min(2, dowFactor));
      const sigma = stddev(revenueValues) * 0.5;
      forecast.push({
        date:            fds,
        forecastRevenue: r2(base),
        low:             r2(Math.max(0, base - sigma)),
        high:            r2(base + sigma),
        confidence,
        forecastCount:   r2(base / (rolling14Avg > 0 ? rolling14Avg : 1) * (last14.reduce((s, d) => s + d.count, 0) / 14)),
      });
    }

    // ── Day-of-week demand heatmap ─────────────────────────────────────────────
    const DOW_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dowDemand = dowAvg.map((avg, i) => ({
      dow: i,
      name: DOW_NAMES[i],
      avgRevenue: r2(avg),
      relativeLoad: globalAvg > 0 ? r2(avg / globalAvg * 100) : 0,
      isHigh: avg > globalAvg * 1.2,
      isLow:  avg < globalAvg * 0.8,
    }));

    // ── Category demand ────────────────────────────────────────────────────────
    const catMap = new Map<string, number>();
    for (const apt of appointments) {
      for (const { service } of apt.services) {
        catMap.set(service.category, (catMap.get(service.category) ?? 0) + 1);
      }
    }
    const categoryDemand = [...catMap.entries()].map(([cat, count]) => ({ category: cat, count }))
      .sort((a, b) => b.count - a.count);

    // ── Monthly projections ────────────────────────────────────────────────────
    const projectedThisMonth  = r2(rolling14Avg * clampedTrend * 30);
    const projectedNext30     = forecast.slice(0, 30).reduce((s, d) => s + d.forecastRevenue, 0);
    const trend: 'up' | 'down' | 'stable' =
      clampedTrend > 1.05 ? 'up' : clampedTrend < 0.95 ? 'down' : 'stable';

    console.log('[executive/forecast] done', {
      horizon, rolling14Avg, confidence, trend, forecastPoints: forecast.length,
    });

    return ok({
      generatedAt:      now.toISOString(),
      historicalDays:   historicalDays.slice(-30), // last 30 for chart
      forecast,
      rolling14Avg:     r2(rolling14Avg),
      weeklyTrendFactor: r2(clampedTrend),
      trend,
      confidence,
      projectedThisMonth,
      projectedNext30Days: r2(projectedNext30),
      dowDemand,
      categoryDemand,
      summary: {
        avgDailyRevenue:    r2(rolling14Avg),
        busiestDay:         DOW_NAMES[dowAvg.indexOf(Math.max(...dowAvg))],
        slowestDay:         DOW_NAMES[dowAvg.indexOf(Math.min(...dowAvg))],
        expectedRevenue30d: r2(projectedNext30),
      },
    });
  } catch (err) {
    console.error('[executive/forecast] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Forecast failed', 500);
  }
}
