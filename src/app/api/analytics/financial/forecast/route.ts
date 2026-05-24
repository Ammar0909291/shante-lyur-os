export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  ok,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type {
  FinancialForecastResponse,
  FinancialDayPoint,
  ForecastPoint,
  ForecastConfidence,
} from '@/types/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

function localDateStr(date: Date, timezone: string): string {
  return date.toLocaleDateString('sv-SE', { timeZone: timezone });
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function forecastConfidence(dailyRevenues: number[]): ForecastConfidence {
  const nonZero = dailyRevenues.filter(v => v > 0);
  if (nonZero.length < 7) return 'low';
  const mean = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
  if (mean === 0) return 'low';
  const cv = stddev(nonZero) / mean; // coefficient of variation
  if (cv < 0.3) return 'high';
  if (cv < 0.6) return 'medium';
  return 'low';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
  const from30 = new Date(todayStart.getTime() - 29 * 86_400_000);

  try {
    const appointments = await prisma.appointment.findMany({
      where: { startAt: { gte: from30, lt: todayEnd }, status: 'COMPLETED' },
      select: { startAt: true, totalPrice: true },
    });

    // Build 30-day historical series (zero-filled)
    const dayMap = new Map<string, { revenue: number; sessionCount: number }>();
    for (const apt of appointments as { startAt: Date; totalPrice: { toNumber(): number } }[]) {
      const key = localDateStr(apt.startAt, SALON_TIMEZONE);
      const prev = dayMap.get(key) ?? { revenue: 0, sessionCount: 0 };
      dayMap.set(key, { revenue: prev.revenue + toNum(apt.totalPrice), sessionCount: prev.sessionCount + 1 });
    }

    const historicalDays: FinancialDayPoint[] = [];
    const cursor = new Date(from30);
    while (cursor < todayEnd) {
      const key = localDateStr(cursor, SALON_TIMEZONE);
      const entry = dayMap.get(key) ?? { revenue: 0, sessionCount: 0 };
      historicalDays.push({ date: key, revenue: entry.revenue, sessionCount: entry.sessionCount });
      cursor.setTime(cursor.getTime() + 86_400_000);
    }

    // Rolling average of last 7 days
    const last7 = historicalDays.slice(-7);
    const prev7 = historicalDays.slice(-14, -7);

    const rollingAvgRevenue =
      last7.length > 0
        ? last7.reduce((s, d) => s + d.revenue, 0) / last7.length
        : 0;

    const prev7Avg =
      prev7.length > 0
        ? prev7.reduce((s, d) => s + d.revenue, 0) / prev7.length
        : 0;

    // Trend: compare last 7 days avg vs prior 7 days avg
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (prev7Avg > 0) {
      const change = (rollingAvgRevenue - prev7Avg) / prev7Avg;
      if (change > 0.05) trend = 'up';
      else if (change < -0.05) trend = 'down';
    }

    // Confidence based on last 30 days CV
    const allRevenues = historicalDays.map(d => d.revenue);
    const confidence = forecastConfidence(allRevenues);

    // Forecast: next 7 days each get the rolling average
    const forecast: ForecastPoint[] = [];
    const forecastStart = new Date(todayEnd);
    for (let i = 0; i < 7; i++) {
      const forecastDate = localDateStr(
        new Date(forecastStart.getTime() + i * 86_400_000),
        SALON_TIMEZONE,
      );
      forecast.push({
        date: forecastDate,
        forecastedRevenue: Math.round(rollingAvgRevenue),
        confidence,
      });
    }

    return ok<FinancialForecastResponse>({
      generatedAt: new Date().toISOString(),
      historicalDays,
      forecast,
      rollingAvgRevenue,
      trend,
    });
  } catch (err) {
    console.error('[analytics/financial/forecast] error', err);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate forecast' } },
      { status: 500 },
    );
  }
}
