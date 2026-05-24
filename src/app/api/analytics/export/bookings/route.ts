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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
  NO_SHOW: 'Неявка',
  RESCHEDULED: 'Перенесено',
};

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
      where: { startAt: { gte: from, lt: to } },
      select: {
        startAt: true,
        status: true,
        totalPrice: true,
        totalDuration: true,
        client: {
          select: { firstName: true, lastName: true },
        },
        specialist: {
          select: {
            specialization: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        services: {
          select: {
            service: { select: { name: true, category: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    type AptRow = typeof appointments[number];

    const fromStr = dateRu(from);
    const toStr = dateRu(new Date(to.getTime() - 1));
    const ts = nowTimestamp();

    const headers = [
      'Дата',
      'Время',
      'Клиент',
      'Специалист',
      'Услуга(и)',
      'Тип специалиста',
      'Продолж. (мин)',
      'Статус',
      'Выручка (₽)',
    ];

    const dataRows = (appointments as AptRow[]).map(apt => {
      const datePart = apt.startAt.toLocaleDateString('ru-RU', {
        timeZone: SALON_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timePart = apt.startAt.toLocaleTimeString('ru-RU', {
        timeZone: SALON_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
      });
      const clientName = `${apt.client.firstName} ${apt.client.lastName}`;
      const specialistName = `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`;
      const serviceNames = apt.services.map(s => s.service.name).join(', ') || '—';
      const specialistType =
        deriveSpecialistType(apt.specialist.specialization) === 'MASSAGE'
          ? 'Массаж'
          : 'Косметология';
      const statusLabel = STATUS_LABELS[apt.status as string] ?? apt.status;

      return [
        datePart,
        timePart,
        clientName,
        specialistName,
        serviceNames,
        specialistType,
        apt.totalDuration,
        statusLabel,
        toNum(apt.totalPrice),
      ];
    });

    const rows = [
      [ts, `Период: ${fromStr} — ${toStr}`],
      headers,
      ...dataRows,
    ];

    const ws = makeSheet(rows, [14, 8, 24, 24, 36, 14, 14, 16, 12]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Записи');

    const fileFrom = fromStr.split('.').reverse().join('-');
    const fileTo = toStr.split('.').reverse().join('-');
    return buildXlsxResponse(wb, `bookings-${fileFrom}_${fileTo}.xlsx`);
  } catch (err) {
    console.error('[analytics/export/bookings] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate export', 500);
  }
}
