export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { type AppointmentStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  getDateBounds,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import { nowTimestamp, makeSheet, buildXlsxResponse } from '../_xlsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_TARGET = 6.0;
const ACTIVE_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

function calcWeight(totalDuration: number): number {
  return totalDuration >= 85 ? 1.5 : 1.0;
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

    const ids = massageSpecialists.map(s => s.id);

    const [appointments, overrides] = await Promise.all([
      ids.length > 0
        ? prisma.appointment.findMany({
            where: {
              specialistId: { in: ids },
              startAt: { gte: start, lt: end },
              status: { in: ACTIVE_STATUSES },
            },
            select: { specialistId: true, totalDuration: true },
          })
        : Promise.resolve([]),
      ids.length > 0
        ? prisma.workloadOverride.findMany({
            where: { specialistId: { in: ids }, date: start },
            select: { specialistId: true, reason: true },
          })
        : Promise.resolve([]),
    ]);

    type AptRow = { specialistId: string; totalDuration: number };
    const weightBySpec = new Map<string, number>();
    for (const apt of appointments as AptRow[]) {
      weightBySpec.set(
        apt.specialistId,
        (weightBySpec.get(apt.specialistId) ?? 0) + calcWeight(apt.totalDuration),
      );
    }

    const overrideMap = new Map<string, string | null>();
    for (const ov of overrides as { specialistId: string; reason: string | null }[]) {
      overrideMap.set(ov.specialistId, ov.reason);
    }

    const headers = [
      'Специалист',
      'Сеансов сегодня',
      'Нагрузка (ед.)',
      'Норма выполнена',
      'До нормы (ед.)',
      'Статус',
      'Причина снятия нормы',
    ];

    const dataRows = massageSpecialists.map(s => {
      const sessionWeight = weightBySpec.get(s.id) ?? 0;
      const targetMet = sessionWeight >= DAILY_TARGET;
      const isOverridden = overrideMap.has(s.id);
      const overrideReason = isOverridden ? (overrideMap.get(s.id) ?? '') : '';
      const remaining = Math.max(0, DAILY_TARGET - sessionWeight);

      let status: string;
      if (isOverridden) status = 'Норма снята';
      else if (targetMet) status = 'Норма выполнена';
      else status = 'Ниже нормы';

      return [
        `${s.user.firstName} ${s.user.lastName}`,
        Math.round(sessionWeight / 1), // sessions count via weight — approximate; weight = sessions*factor
        sessionWeight,
        targetMet ? 'Да' : 'Нет',
        remaining,
        status,
        overrideReason,
      ];
    });

    const rows = [
      [nowTimestamp(), `Дата: ${dateStr}`],
      headers,
      ...dataRows,
    ];

    const ws = makeSheet(rows, [28, 14, 14, 16, 14, 18, 30]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Нагрузка массажистов');

    return buildXlsxResponse(wb, `massage-workload-${dateStr}.xlsx`);
  } catch (err) {
    console.error('[analytics/export/massage-workload] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate export', 500);
  }
}
