export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { makeSheet, buildXlsxResponse, dateRu, nowTimestamp } from '@/app/api/analytics/export/_xlsx';
import { calculatePayroll } from '@/lib/payroll-engine';

// ─── GET /api/payroll/export ──────────────────────────────────────────────────
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&specialistId?
// Generates: Payroll Summary, Commission Detail, Attendance, Adjustments sheets

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Only admins can export payroll data', 403);
  }

  const p    = req.nextUrl.searchParams;
  const from = p.get('from') ? new Date(p.get('from')! + 'T00:00:00.000Z') : new Date(Date.now() - 30 * 86_400_000);
  const to   = p.get('to')   ? new Date(p.get('to')!   + 'T23:59:59.999Z') : new Date();
  const filterSpecId = p.get('specialistId') ?? undefined;

  try {
    const specialists = await prisma.specialist.findMany({
      where: {
        status: 'ACTIVE',
        ...(filterSpecId ? { id: filterSpecId } : {}),
      },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { firstName: 'asc' } },
    });

    // ── Sheet 1: Payroll Summary ───────────────────────────────────────────────
    const summaryRows: unknown[][] = [
      [`Ведомость заработной платы — ${dateRu(from)} – ${dateRu(to)}`],
      [nowTimestamp()],
      [],
      ['Специалист', 'Тип', 'Оклад', 'Комиссия', 'Бонусы', 'Штрафы', 'Удержания', 'К выплате', 'Визиты', 'Выручка'],
    ];

    const allCalcs = await Promise.all(
      specialists.map((s) => calculatePayroll(s.id, from, to).catch((e) => { console.error('[payroll/export] calc error', s.id, e); return null; }))
    );

    let totalPayable = 0;
    for (const calc of allCalcs) {
      if (!calc) continue;
      totalPayable += calc.netPayable;
      summaryRows.push([
        calc.specialistName,
        calc.compensationType,
        calc.baseSalary,
        calc.totalCommission,
        calc.totalBonuses,
        -calc.totalPenalties,
        -calc.totalDeductions,
        calc.netPayable,
        calc.completedApts,
        calc.totalRevenue,
      ]);
    }
    summaryRows.push([]);
    summaryRows.push(['ИТОГО', '', '', '', '', '', '', totalPayable, '', '']);

    const sheetSummary = makeSheet(summaryRows, [28, 22, 14, 14, 12, 12, 14, 14, 10, 14], 4);

    // ── Sheet 2: Commission Detail ─────────────────────────────────────────────
    const commRows: unknown[][] = [
      ['Детализация комиссий'],
      [nowTimestamp()],
      [],
      ['Специалист', 'Дата', 'Визит ID', 'Услуги', 'Выручка', 'Ставка', 'Комиссия', 'Возврат'],
    ];
    for (const calc of allCalcs) {
      if (!calc) continue;
      for (const b of calc.breakdown) {
        commRows.push([
          calc.specialistName,
          dateRu(b.date),
          b.appointmentId.slice(0, 8),
          b.serviceNames.join(', '),
          b.revenue,
          `${(b.commissionRate * 100).toFixed(0)}%`,
          b.commission,
          b.isRefunded ? 'Возврат' : '',
        ]);
      }
    }
    const sheetComm = makeSheet(commRows, [24, 12, 10, 32, 12, 10, 12, 10], 4);

    // ── Sheet 3: Attendance ────────────────────────────────────────────────────
    const attRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(filterSpecId ? { specialistId: filterSpecId } : {}),
      },
      include: { specialist: { select: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: [{ specialistId: 'asc' }, { date: 'asc' }],
    });
    const attRows: unknown[][] = [
      ['Табель учёта рабочего времени'],
      [nowTimestamp()],
      [],
      ['Специалист', 'Дата', 'Статус', 'Приход', 'Уход', 'Перерыв (мин)', 'Часов отработано', 'Завершено визитов'],
    ];
    for (const a of attRecords) {
      const workedH = a.checkInAt && a.checkOutAt
        ? Math.max(0, (a.checkOutAt.getTime() - a.checkInAt.getTime()) / 3_600_000 - a.breakMinutes / 60)
        : null;
      attRows.push([
        a.specialist.user ? `${a.specialist.user.firstName} ${a.specialist.user.lastName}` : '',
        dateRu(a.date),
        a.status,
        a.checkInAt ? a.checkInAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' }) : '',
        a.checkOutAt ? a.checkOutAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' }) : '',
        a.breakMinutes,
        workedH !== null ? Math.round(workedH * 100) / 100 : '',
        a.completedApts,
      ]);
    }
    const sheetAtt = makeSheet(attRows, [24, 12, 14, 10, 10, 16, 18, 18], 4);

    // ── Sheet 4: Adjustments ──────────────────────────────────────────────────
    const adjRecords = await prisma.payrollAdjustment.findMany({
      where: {
        payroll: {
          periodStart: { gte: from, lte: to },
          ...(filterSpecId ? { specialistId: filterSpecId } : {}),
        },
      },
      include: { payroll: { select: { specialist: { select: { user: { select: { firstName: true, lastName: true } } } }, periodStart: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const adjRows: unknown[][] = [
      ['Корректировки заработной платы'],
      [nowTimestamp()],
      [],
      ['Специалист', 'Период', 'Тип', 'Сумма', 'Причина'],
    ];
    for (const a of adjRecords) {
      adjRows.push([
        a.payroll.specialist.user ? `${a.payroll.specialist.user.firstName} ${a.payroll.specialist.user.lastName}` : '',
        dateRu(a.payroll.periodStart),
        a.type,
        Number(a.amount),
        a.reason ?? '',
      ]);
    }
    const sheetAdj = makeSheet(adjRows, [24, 14, 24, 14, 40], 4);

    // ── Build workbook ────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetSummary, 'Ведомость');
    XLSX.utils.book_append_sheet(wb, sheetComm,    'Комиссии');
    XLSX.utils.book_append_sheet(wb, sheetAtt,     'Табель');
    XLSX.utils.book_append_sheet(wb, sheetAdj,     'Корректировки');

    const fromStr = from.toISOString().split('T')[0];
    const toStr   = to.toISOString().split('T')[0];
    return buildXlsxResponse(wb, `payroll_${fromStr}_${toStr}.xlsx`);
  } catch (err) {
    console.error('[payroll/export]', err);
    return apiError('INTERNAL_ERROR', 'Failed to export payroll', 500);
  }
}
