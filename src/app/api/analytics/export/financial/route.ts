export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import { nowTimestamp, makeSheet, buildXlsxResponse, dateRu } from '../_xlsx';

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

function localDayOfWeek(date: Date, timezone: string): number {
  const raw = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    .format(date);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[raw] ?? 0;
}

function localHour(date: Date, timezone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false })
      .formatToParts(date)
      .find(p => p.type === 'hour')?.value ?? '0',
  );
}

const DOW_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

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
      select: {
        totalPrice: true,
        totalDuration: true,
        startAt: true,
        specialist: { select: { specialization: true } },
        services: {
          select: {
            price: true,
            service: { select: { category: true } },
          },
        },
      },
    });

    type AptRow = typeof appointments[number];

    const fromStr = dateRu(from);
    const toStr = dateRu(new Date(to.getTime() - 1));
    const ts = nowTimestamp();

    // ── Sheet 1: daily revenue ─────────────────────────────────────────────────
    const dayMap = new Map<string, { revenue: number; sessions: number }>();
    for (const apt of appointments as AptRow[]) {
      const key = localDateStr(apt.startAt, SALON_TIMEZONE);
      const prev = dayMap.get(key) ?? { revenue: 0, sessions: 0 };
      dayMap.set(key, {
        revenue: prev.revenue + toNum(apt.totalPrice),
        sessions: prev.sessions + 1,
      });
    }

    const revenueRows: unknown[][] = [
      [ts, `Период: ${fromStr} — ${toStr}`],
      ['Дата', 'Выручка (₽)', 'Кол-во сеансов'],
    ];
    const cursor = new Date(from);
    while (cursor < to) {
      const key = localDateStr(cursor, SALON_TIMEZONE);
      const entry = dayMap.get(key) ?? { revenue: 0, sessions: 0 };
      revenueRows.push([
        key.split('-').reverse().join('.'), // YYYY-MM-DD → DD.MM.YYYY
        entry.revenue,
        entry.sessions,
      ]);
      cursor.setTime(cursor.getTime() + 86_400_000);
    }

    // ── Sheet 2: by category ──────────────────────────────────────────────────
    const catMap = new Map<string, { revenue: number; sessions: number }>();
    for (const apt of appointments as AptRow[]) {
      for (const svc of apt.services) {
        const cat = svc.service.category as string;
        const prev = catMap.get(cat) ?? { revenue: 0, sessions: 0 };
        catMap.set(cat, {
          revenue: prev.revenue + toNum(svc.price),
          sessions: prev.sessions + 1,
        });
      }
    }
    const total = appointments.reduce((s, a) => s + toNum(a.totalPrice), 0);

    const bySpecMap = new Map<'MASSAGE' | 'COSMETOLOGY', { revenue: number; sessions: number }>();
    for (const apt of appointments as AptRow[]) {
      const t = deriveSpecialistType(apt.specialist?.specialization);
      const prev = bySpecMap.get(t) ?? { revenue: 0, sessions: 0 };
      bySpecMap.set(t, { revenue: prev.revenue + toNum(apt.totalPrice), sessions: prev.sessions + 1 });
    }

    const catRows: unknown[][] = [
      [ts, `Период: ${fromStr} — ${toStr}`],
      ['Категория', 'Выручка (₽)', 'Сеансов', 'Средний чек (₽)', 'Доля %'],
    ];
    const sortedCats = [...catMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    for (const [cat, v] of sortedCats) {
      const avgTicket = v.sessions > 0 ? Math.round(v.revenue / v.sessions) : 0;
      const share = total > 0 ? `${Math.round((v.revenue / total) * 100)}%` : '0%';
      catRows.push([cat, v.revenue, v.sessions, avgTicket, share]);
    }
    // Specialist type rows
    catRows.push([]);
    catRows.push(['— По типу специалиста —']);
    catRows.push(['Тип', 'Выручка (₽)', 'Сеансов']);
    for (const [specType, v] of bySpecMap.entries()) {
      catRows.push([specType === 'MASSAGE' ? 'Массаж' : 'Косметология', v.revenue, v.sessions]);
    }

    // ── Sheet 3: peak hours ───────────────────────────────────────────────────
    const heatMap = new Map<string, { count: number; revenue: number }>();
    for (const apt of appointments as AptRow[]) {
      const dow = localDayOfWeek(apt.startAt, SALON_TIMEZONE);
      const hour = localHour(apt.startAt, SALON_TIMEZONE);
      const key = `${dow}-${hour}`;
      const prev = heatMap.get(key) ?? { count: 0, revenue: 0 };
      heatMap.set(key, { count: prev.count + 1, revenue: prev.revenue + toNum(apt.totalPrice) });
    }

    const peakRows: unknown[][] = [
      [ts, `Период: ${fromStr} — ${toStr}`],
      ['День недели', 'Час', 'Записей', 'Выручка (₽)'],
    ];
    for (const [key, v] of [...heatMap.entries()].sort()) {
      const [dow, hour] = key.split('-').map(Number);
      peakRows.push([DOW_NAMES[dow] ?? dow, `${hour}:00`, v.count, v.revenue]);
    }

    // ── Build workbook ────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(revenueRows, [14, 14, 16]), 'Выручка по дням');
    XLSX.utils.book_append_sheet(wb, makeSheet(catRows, [22, 14, 10, 16, 10]), 'По категориям');
    XLSX.utils.book_append_sheet(wb, makeSheet(peakRows, [16, 8, 10, 14]), 'Пиковые часы');

    const fileFrom = fromStr.split('.').reverse().join('-');
    const fileTo = toStr.split('.').reverse().join('-');
    return buildXlsxResponse(wb, `financial-report-${fileFrom}_${fileTo}.xlsx`);
  } catch (err) {
    console.error('[analytics/export/financial] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate export', 500);
  }
}
