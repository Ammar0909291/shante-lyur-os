export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { makeSheet, buildXlsxResponse, dateRu, nowTimestamp } from '@/app/api/analytics/export/_xlsx';

// ─── GET /api/finance/export ──────────────────────────────────────────────────
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&type=all|payments|expenses|specialists|refunds

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p    = req.nextUrl.searchParams;
  const from = p.get('from') ? new Date(p.get('from')! + 'T00:00:00Z') : new Date(Date.now() - 30 * 86_400_000);
  const to   = p.get('to')   ? new Date(p.get('to')!   + 'T23:59:59Z') : new Date();
  const type = p.get('type') ?? 'all';

  console.log('[finance/export]', { from, to, type });

  try {
    const [completedApts, payments, refunds, expenses] = await Promise.all([
      prisma.appointment.findMany({
        where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
        select: {
          id: true,
          totalPrice: true,
          paidAmount: true,
          discountAmount: true,
          paymentStatus: true,
          checkedOutAt: true,
          client: { select: { firstName: true, lastName: true, phone: true } },
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
          services: { select: { service: { select: { name: true } }, price: true } },
        },
      }),
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: from, lte: to } },
        include: {
          appointment: {
            select: {
              client: { select: { firstName: true, lastName: true } },
              specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: from, lte: to } },
        include: { payment: { select: { provider: true, appointmentId: true } } },
        orderBy: { processedAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        include: { creator: { select: { firstName: true, lastName: true } } },
        orderBy: [{ date: 'asc' }],
      }),
    ]);

    const wb = XLSX.utils.book_new();
    const ts = nowTimestamp();
    const periodLabel = `${dateRu(from)} — ${dateRu(to)}`;

    // ── Sheet 1: Payments ──────────────────────────────────────────────────────
    const payRows: unknown[][] = [
      [`Платежи | ${periodLabel}`],
      [ts],
      ['Дата', 'Клиент', 'Специалист', 'Метод', 'Сумма', 'Депозит', 'Статус оплаты'],
    ];
    for (const pmt of payments) {
      const client = pmt.appointment?.client
        ? `${pmt.appointment.client.firstName} ${pmt.appointment.client.lastName}`
        : '—';
      const spec = pmt.appointment?.specialist?.user
        ? `${pmt.appointment.specialist.user.firstName} ${pmt.appointment.specialist.user.lastName}`
        : '—';
      payRows.push([
        pmt.paidAt ? dateRu(pmt.paidAt) : '—',
        client,
        spec,
        pmt.provider,
        Number(pmt.amount),
        pmt.isDeposit ? 'Да' : 'Нет',
        pmt.status,
      ]);
    }
    const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);
    payRows.push([]);
    payRows.push(['ИТОГО', '', '', '', totalPayments, '', '']);
    wb.SheetNames.push('Платежи');
    wb.Sheets['Платежи'] = makeSheet(payRows, [15, 25, 25, 18, 14, 10, 18], 3);

    // ── Sheet 2: Refunds ───────────────────────────────────────────────────────
    const refRows: unknown[][] = [
      [`Возвраты | ${periodLabel}`],
      [ts],
      ['Дата', 'Сумма', 'Метод', 'Причина'],
    ];
    for (const ref of refunds) {
      refRows.push([
        ref.processedAt ? dateRu(ref.processedAt) : '—',
        Number(ref.amount),
        ref.payment.provider,
        ref.reason ?? '—',
      ]);
    }
    const totalRefunds = refunds.reduce((s, r) => s + Number(r.amount), 0);
    refRows.push([]);
    refRows.push(['ИТОГО', totalRefunds, '', '']);
    wb.SheetNames.push('Возвраты');
    wb.Sheets['Возвраты'] = makeSheet(refRows, [15, 14, 18, 40], 3);

    // ── Sheet 3: Expenses ──────────────────────────────────────────────────────
    const expRows: unknown[][] = [
      [`Расходы | ${periodLabel}`],
      [ts],
      ['Дата', 'Категория', 'Сумма', 'Описание', 'Поставщик', 'Чек/Реф'],
    ];
    const catLabels: Record<string, string> = {
      INVENTORY_PURCHASE: 'Закупка товаров',
      RENT:               'Аренда',
      UTILITIES:          'Коммунальные',
      SALARY:             'Зарплата',
      OPERATIONAL:        'Операционные',
      MARKETING:          'Маркетинг',
      OTHER:              'Прочее',
    };
    for (const e of expenses) {
      expRows.push([
        e.date.toISOString().split('T')[0],
        catLabels[e.category] ?? e.category,
        Number(e.amount),
        e.description,
        e.supplier ?? '—',
        e.receiptRef ?? '—',
      ]);
    }
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    expRows.push([]);
    expRows.push(['ИТОГО', '', totalExpenses, '', '', '']);
    wb.SheetNames.push('Расходы');
    wb.Sheets['Расходы'] = makeSheet(expRows, [15, 22, 14, 45, 25, 20], 3);

    // ── Sheet 4: Specialists ───────────────────────────────────────────────────
    const specMap = new Map<string, { name: string; revenue: number; count: number }>();
    for (const apt of completedApts) {
      const name = apt.specialist?.user
        ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`
        : 'Неизвестно';
      const paid = Number(apt.paidAmount);
      const existing = specMap.get(name);
      if (existing) { existing.revenue += paid; existing.count++; }
      else specMap.set(name, { name, revenue: paid, count: 1 });
    }

    const specRows: unknown[][] = [
      [`Специалисты | ${periodLabel}`],
      [ts],
      ['Специалист', 'Кол-во процедур', 'Выручка', 'Средний чек'],
    ];
    for (const [, v] of [...specMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue)) {
      specRows.push([
        v.name,
        v.count,
        Math.round(v.revenue * 100) / 100,
        v.count > 0 ? Math.round(v.revenue / v.count * 100) / 100 : 0,
      ]);
    }
    wb.SheetNames.push('Специалисты');
    wb.Sheets['Специалисты'] = makeSheet(specRows, [30, 20, 16, 16], 3);

    // ── Sheet 5: P&L Summary ───────────────────────────────────────────────────
    const totalRevenue  = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalDiscounts = completedApts.reduce((s, a) => s + Number(a.discountAmount ?? 0), 0);
    const netRevenue     = totalRevenue - totalRefunds;
    const netProfit      = netRevenue - totalExpenses;

    const plRows: unknown[][] = [
      [`Отчёт о прибылях и убытках | ${periodLabel}`],
      [ts],
      [],
      ['Показатель', 'Сумма'],
      ['Выручка (всего)',              totalRevenue],
      ['Скидки',                        -totalDiscounts],
      ['Возвраты',                       -totalRefunds],
      ['Чистая выручка',                 netRevenue],
      [],
      ['Расходы (всего)',                -totalExpenses],
      [],
      ['Чистая прибыль',                 netProfit],
      [],
      ['Кол-во завершённых записей',      completedApts.length],
      ['Кол-во платежей',                 payments.length],
      ['Кол-во возвратов',                refunds.length],
    ];
    wb.SheetNames.push('P&L');
    wb.Sheets['P&L'] = makeSheet(plRows, [40, 18], 0);

    const filename = `finance_${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}.xlsx`;
    console.log('[finance/export] done', { filename, sheets: wb.SheetNames });

    return buildXlsxResponse(wb, filename);
  } catch (err) {
    console.error('[finance/export]', err);
    return apiError('INTERNAL_ERROR', 'Failed to export', 500);
  }
}
