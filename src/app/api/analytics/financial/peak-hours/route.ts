export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  ok,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type { PeakHoursResponse, PeakHourCell } from '@/types/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateParam(raw: string | null, fallback: Date): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  const d = new Date(raw + 'T00:00:00Z');
  return isNaN(d.getTime()) ? fallback : d;
}

function toNum(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

// Returns 0=Mon ... 6=Sun for a UTC Date interpreted in the given timezone
function localDayOfWeek(date: Date, timezone: string): number {
  const dayName = date.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' });
  const map: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
    Friday: 4, Saturday: 5, Sunday: 6,
  };
  return map[dayName] ?? 0;
}

function localHour(date: Date, timezone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false })
      .formatToParts(date)
      .find(p => p.type === 'hour')?.value ?? '0',
  );
}

function localDateStr(date: Date, timezone: string): string {
  return date.toLocaleDateString('sv-SE', { timeZone: timezone });
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

  try {
    const appointments = await prisma.appointment.findMany({
      where: { startAt: { gte: from, lt: to }, status: 'COMPLETED' },
      select: { startAt: true, totalPrice: true },
    });

    // Build 7×24 heatmap — only populated cells returned
    const cellMap = new Map<string, PeakHourCell>();

    for (const apt of appointments as { startAt: Date; totalPrice: { toNumber(): number } }[]) {
      const dow = localDayOfWeek(apt.startAt, SALON_TIMEZONE);
      const hour = localHour(apt.startAt, SALON_TIMEZONE);
      const key = `${dow}-${hour}`;
      const prev = cellMap.get(key) ?? { dayOfWeek: dow, hour, bookingCount: 0, revenue: 0 };
      cellMap.set(key, {
        dayOfWeek: dow,
        hour,
        bookingCount: prev.bookingCount + 1,
        revenue: prev.revenue + toNum(apt.totalPrice),
      });
    }

    const heatmap: PeakHourCell[] = [...cellMap.values()].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour,
    );

    // peakHour — cell with highest bookingCount
    let peakHour: PeakHoursResponse['peakHour'] = null;
    if (heatmap.length > 0) {
      const top = heatmap.reduce((best, c) => (c.bookingCount > best.bookingCount ? c : best), heatmap[0]);
      peakHour = { dayOfWeek: top.dayOfWeek, hour: top.hour, bookingCount: top.bookingCount };
    }

    // peakDay — day-of-week with highest total revenue
    const dayRevMap = new Map<number, number>();
    for (const cell of heatmap) {
      dayRevMap.set(cell.dayOfWeek, (dayRevMap.get(cell.dayOfWeek) ?? 0) + cell.revenue);
    }
    let peakDay: PeakHoursResponse['peakDay'] = null;
    if (dayRevMap.size > 0) {
      let bestDow = 0;
      let bestRev = 0;
      for (const [dow, rev] of dayRevMap) {
        if (rev > bestRev) { bestRev = rev; bestDow = dow; }
      }
      peakDay = { dayOfWeek: bestDow, totalRevenue: bestRev };
    }

    const fromStr = localDateStr(from, SALON_TIMEZONE);
    const toStr = localDateStr(new Date(to.getTime() - 1), SALON_TIMEZONE);

    return ok<PeakHoursResponse>({ period: { from: fromStr, to: toStr }, heatmap, peakHour, peakDay });
  } catch (err) {
    console.error('[analytics/financial/peak-hours] error', err);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch peak hours' } },
      { status: 500 },
    );
  }
}
