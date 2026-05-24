export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  pct,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import { nowTimestamp, makeSheet, buildXlsxResponse, dateRu } from '../_xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateParam(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
}

function toNum(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

function calcCompliance(
  specialistType: 'MASSAGE' | 'COSMETOLOGY',
  appointments: { startAt: Date; totalDuration: number; status: string }[],
  timezone: string,
): number | null {
  if (specialistType === 'COSMETOLOGY') return null;

  const byDay = new Map<string, number>();
  for (const apt of appointments) {
    if (apt.status !== 'COMPLETED') continue;
    const dayKey = apt.startAt.toLocaleDateString('sv-SE', { timeZone: timezone });
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + apt.totalDuration);
  }
  if (byDay.size === 0) return 0;

  let compliant = 0;
  for (const total of byDay.values()) {
    if (total >= 360) compliant++;
  }
  return Math.round((compliant / byDay.size) * 100);
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
  const typeFilter = searchParams.get('type');

  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime());

  try {
    const specialists = await prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const filtered = specialists.filter(s => {
      const t = deriveSpecialistType(s.specialization);
      return !typeFilter || t === typeFilter;
    });

    const ids = filtered.map(s => s.id);

    const [currentApts, prevApts] = await Promise.all([
      ids.length > 0
        ? prisma.appointment.findMany({
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
          })
        : Promise.resolve([]),
      ids.length > 0
        ? prisma.appointment.findMany({
            where: {
              specialistId: { in: ids },
              startAt: { gte: prevFrom, lt: prevTo },
              status: 'COMPLETED',
            },
            select: { specialistId: true, totalPrice: true },
          })
        : Promise.resolve([]),
    ]);

    type AptRow = {
      specialistId: string;
      clientId: string;
      totalPrice: { toNumber(): number };
      totalDuration: number;
      startAt: Date;
      status: string;
    };
    type PrevRow = { specialistId: string; totalPrice: { toNumber(): number } };

    const currentBySpec = new Map<string, AptRow[]>();
    for (const apt of currentApts as AptRow[]) {
      const arr = currentBySpec.get(apt.specialistId) ?? [];
      arr.push(apt);
      currentBySpec.set(apt.specialistId, arr);
    }

    const prevRevBySpec = new Map<string, number>();
    for (const apt of prevApts as PrevRow[]) {
      prevRevBySpec.set(
        apt.specialistId,
        (prevRevBySpec.get(apt.specialistId) ?? 0) + toNum(apt.totalPrice),
      );
    }

    const headers = [
      'Специалист',
      'Тип',
      'Сеансов',
      'Выручка (₽)',
      'Ср. продолж. (мин)',
      'Удержание %',
      'Соответствие %',
      'Тренд %',
    ];

    const dataRows = filtered.map(s => {
      const specialistType = deriveSpecialistType(s.specialization);
      const apts = currentBySpec.get(s.id) ?? [];
      const totalSessions = apts.length;
      const revenue = apts.reduce((sum, a) => sum + toNum(a.totalPrice), 0);
      const avgDuration =
        totalSessions > 0
          ? Math.round(apts.reduce((sum, a) => sum + a.totalDuration, 0) / totalSessions)
          : 0;
      const uniqueClients = new Set(apts.map(a => a.clientId));
      const repeatClients = [...uniqueClients].filter(
        cid => apts.filter(a => a.clientId === cid).length >= 2,
      ).length;
      const retention =
        uniqueClients.size > 0 ? Math.round((repeatClients / uniqueClients.size) * 100) : 0;
      const compliance = calcCompliance(specialistType, apts, SALON_TIMEZONE);
      const prevRevenue = prevRevBySpec.get(s.id) ?? 0;
      const trend = pct(revenue, prevRevenue);

      return [
        `${s.user.firstName} ${s.user.lastName}`,
        specialistType === 'MASSAGE' ? 'Массаж' : 'Косметология',
        totalSessions,
        revenue,
        avgDuration,
        `${retention}%`,
        compliance !== null ? `${compliance}%` : '—',
        `${trend > 0 ? '+' : ''}${trend}%`,
      ];
    });

    const fromStr = dateRu(from);
    const toStr = dateRu(new Date(to.getTime() - 1));
    const timestamp = nowTimestamp();

    const rows = [
      [timestamp, `Период: ${fromStr} — ${toStr}`],
      headers,
      ...dataRows,
    ];

    const ws = makeSheet(rows, [28, 14, 10, 14, 18, 12, 16, 10]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Специалисты');

    const fileDate = new Date().toISOString().slice(0, 10);
    return buildXlsxResponse(wb, `specialists-performance-${fileDate}.xlsx`);
  } catch (err) {
    console.error('[analytics/export/specialists] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate export', 500);
  }
}
