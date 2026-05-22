export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { makeSheet, buildXlsxResponse, dateRu, nowTimestamp } from '@/app/api/analytics/export/_xlsx';

// ─── GET /api/executive/export ────────────────────────────────────────────────
// Query: ?period=30|90|180|365

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('period') ?? '30')));
  const now  = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);

  console.log('[executive/export]', { days });

  try {
    const [apts, payments, refunds, expenses, specialists] = await Promise.all([
      prisma.appointment.findMany({
        where: { startAt: { gte: from, lte: now } },
        select: {
          id: true, status: true, totalPrice: true, paidAmount: true,
          startAt: true, checkedOutAt: true,
          client: { select: { firstName: true, lastName: true } },
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
          services: { select: { service: { select: { name: true, category: true } }, price: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: from, lte: now } },
        select: { amount: true, provider: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: from, lte: now } },
        select: { amount: true, reason: true, processedAt: true },
        orderBy: { processedAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: now } },
        select: { amount: true, category: true, description: true, date: true },
        orderBy: { date: 'asc' },
      }),
      prisma.specialist.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
          appointments: {
            where: { startAt: { gte: from, lte: now }, status: 'COMPLETED' },
            select: { totalPrice: true, clientId: true },
          },
        },
      }),
    ]);

    const wb  = XLSX.utils.book_new();
    const ts  = nowTimestamp();
    const per = `${dateRu(from)} — ${dateRu(now)}`;

    // ── Sheet 1: Executive Summary ────────────────────────────────────────────
    const totalRevenue  = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalRefunds  = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const completed     = apts.filter(a => a.status === 'COMPLETED');
    const cancelled     = apts.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW');
    const occupancyRate = apts.length > 0 ? Math.round(completed.length / apts.length * 100) : 0;
    const clientIds     = new Set(completed.map(a => a.client ? `${a.client.firstName}${a.client.lastName}` : ''));

    const sumRows: unknown[][] = [
      [`Исполнительный отчёт | ${per}`],
      [ts],
      [],
      ['Показатель', 'Значение'],
      ['Период (дней)',            days],
      ['Записей всего',            apts.length],
      ['Завершено',                completed.length],
      ['Отменено / Неявка',        cancelled.length],
      ['Коэффициент загруженности', `${occupancyRate}%`],
      ['Уникальных клиентов',      clientIds.size],
      [],
      ['Выручка (получено)',        totalRevenue],
      ['Возвраты',                 -totalRefunds],
      ['Чистая выручка',           totalRevenue - totalRefunds],
      ['Операционные расходы',     -totalExpenses],
      ['Чистая прибыль',           totalRevenue - totalRefunds - totalExpenses],
      [],
      ['Ср. чек',                  completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0],
      ['Ср. выручка в день',       Math.round(totalRevenue / days)],
      ['Прогноз на след. 30 дней', Math.round(totalRevenue / days * 30)],
    ];
    wb.SheetNames.push('Сводка');
    wb.Sheets['Сводка'] = makeSheet(sumRows, [40, 18], 0);

    // ── Sheet 2: Daily Revenue ────────────────────────────────────────────────
    const dayRevMap = new Map<string, number>();
    for (const a of completed) {
      const d = a.startAt.toISOString().split('T')[0];
      dayRevMap.set(d, (dayRevMap.get(d) ?? 0) + Number(a.totalPrice));
    }
    const dailyRows: unknown[][] = [
      [`Ежедневная выручка | ${per}`], [ts],
      ['Дата', 'Выручка', 'Кол-во записей'],
    ];
    const cur = new Date(from);
    while (cur <= now) {
      const d = cur.toISOString().split('T')[0];
      const dayApts = completed.filter(a => a.startAt.toISOString().split('T')[0] === d);
      dailyRows.push([d, dayRevMap.get(d) ?? 0, dayApts.length]);
      cur.setTime(cur.getTime() + 86_400_000);
    }
    wb.SheetNames.push('По дням');
    wb.Sheets['По дням'] = makeSheet(dailyRows, [15, 16, 16], 3);

    // ── Sheet 3: Specialists ──────────────────────────────────────────────────
    const specRows: unknown[][] = [
      [`Специалисты | ${per}`], [ts],
      ['Специалист', 'Завершено', 'Выручка', 'Ср. чек', 'Клиентов', 'Эффективность'],
    ];
    for (const spec of specialists) {
      const sApts = spec.appointments;
      const sRev  = sApts.reduce((s, a) => s + Number(a.totalPrice), 0);
      const sClients = new Set(sApts.map(a => a.clientId)).size;
      const avgCheck = sApts.length > 0 ? Math.round(sRev / sApts.length) : 0;
      const efficiency = Math.min(100, Math.round(
        (sApts.length > 0 ? 50 : 0) + (sClients > 0 ? 25 : 0) + (avgCheck > 3000 ? 25 : avgCheck / 3000 * 25)
      ));
      specRows.push([
        `${spec.user.firstName} ${spec.user.lastName}`,
        sApts.length,
        Math.round(sRev),
        avgCheck,
        sClients,
        `${efficiency}%`,
      ]);
    }
    wb.SheetNames.push('Специалисты');
    wb.Sheets['Специалисты'] = makeSheet(specRows, [28, 14, 16, 14, 14, 16], 3);

    // ── Sheet 4: Services by Revenue ─────────────────────────────────────────
    const svcMap = new Map<string, { revenue: number; count: number; category: string }>();
    for (const apt of completed) {
      for (const { service, price } of apt.services) {
        const k = service.name;
        const ex = svcMap.get(k);
        if (ex) { ex.revenue += Number(price); ex.count++; }
        else svcMap.set(k, { revenue: Number(price), count: 1, category: service.category });
      }
    }
    const svcRows: unknown[][] = [
      [`Услуги | ${per}`], [ts],
      ['Услуга', 'Категория', 'Выручка', 'Кол-во', 'Ср. цена'],
    ];
    for (const [name, v] of [...svcMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue)) {
      svcRows.push([name, v.category, Math.round(v.revenue), v.count, Math.round(v.revenue / v.count)]);
    }
    wb.SheetNames.push('Услуги');
    wb.Sheets['Услуги'] = makeSheet(svcRows, [35, 18, 16, 12, 14], 3);

    // ── Sheet 5: Operational Risks ────────────────────────────────────────────
    const cancelRate = apts.length > 0 ? Math.round(cancelled.length / apts.length * 100) : 0;
    const refundRate = totalRevenue > 0 ? Math.round(totalRefunds / totalRevenue * 100) : 0;
    const riskRows: unknown[][] = [
      [`Операционные риски | ${per}`], [ts],
      [],
      ['Индикатор', 'Значение', 'Статус'],
      ['Процент отмен',      `${cancelRate}%`,  cancelRate > 20 ? 'ВЫСОКИЙ' : cancelRate > 10 ? 'СРЕДНИЙ' : 'НОРМА'],
      ['Процент возвратов',  `${refundRate}%`,  refundRate > 10 ? 'ВЫСОКИЙ' : refundRate > 5 ? 'СРЕДНИЙ' : 'НОРМА'],
      ['Загруженность',      `${occupancyRate}%`, occupancyRate < 40 ? 'НИЗКАЯ' : occupancyRate < 60 ? 'СРЕДНЯЯ' : 'ХОРОШАЯ'],
      ['Чистая прибыль',     totalRevenue - totalRefunds - totalExpenses, totalRevenue - totalRefunds - totalExpenses < 0 ? 'УБЫТОК' : 'ПРИБЫЛЬ'],
    ];
    wb.SheetNames.push('Риски');
    wb.Sheets['Риски'] = makeSheet(riskRows, [30, 20, 14], 0);

    const filename = `executive_report_${days}d_${now.toISOString().split('T')[0]}.xlsx`;
    console.log('[executive/export] done', { filename });
    return buildXlsxResponse(wb, filename);
  } catch (err) {
    console.error('[executive/export] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Export failed', 500);
  }
}
