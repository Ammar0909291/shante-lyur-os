export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

// ─── GET /api/finance/closing ─────────────────────────────────────────────────
// Query: ?date=YYYY-MM-DD (defaults to today in Yekaterinburg time, UTC+5)

const YEKT_OFFSET_H = 5;

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const dateStr = req.nextUrl.searchParams.get('date');
  // Derive YEKT "today" when no date supplied
  const nowUtc    = new Date();
  const yektToday = new Date(nowUtc.getTime() + YEKT_OFFSET_H * 3600_000).toISOString().split('T')[0];
  const resolvedDate = dateStr ?? yektToday;
  // Parse as UTC midnight, then shift to Yekaterinburg midnight (= UTC 19:00 prev day)
  const utcMidnight = new Date(resolvedDate + 'T00:00:00.000Z');
  const dateStart   = new Date(utcMidnight.getTime() - YEKT_OFFSET_H * 3600_000);
  const dateEnd     = new Date(utcMidnight.getTime() + (24 - YEKT_OFFSET_H) * 3600_000 - 1);

  try {
    const [payments, refunds, completedApts, unpaidApts, expenses] = await Promise.all([
      // All CAPTURED payments created today
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: dateStart, lte: dateEnd } },
        select: { id: true, amount: true, provider: true, appointmentId: true, isDeposit: true },
      }),
      // All COMPLETED refunds processed today
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: dateStart, lte: dateEnd } },
        select: { id: true, amount: true, reason: true, paymentId: true },
      }),
      // COMPLETED appointments today (checked out)
      prisma.appointment.findMany({
        where: { status: 'COMPLETED', checkedOutAt: { gte: dateStart, lte: dateEnd } },
        select: {
          id: true,
          totalPrice: true,
          paidAmount: true,
          discountAmount: true,
          paymentStatus: true,
          client: { select: { firstName: true, lastName: true } },
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
          services: { select: { service: { select: { name: true } }, price: true } },
        },
      }),
      // Unpaid/partial appointments today
      prisma.appointment.findMany({
        where: {
          startAt: { gte: dateStart, lte: dateEnd },
          paymentStatus: { in: ['UNPAID', 'DEPOSIT_PAID', 'PARTIAL_PAID'] },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: {
          id: true,
          totalPrice: true,
          paidAmount: true,
          paymentStatus: true,
          client: { select: { firstName: true, lastName: true } },
        },
      }),
      // Operational expenses recorded today
      prisma.expense.findMany({
        where: { date: { gte: dateStart, lte: dateEnd } },
        select: { id: true, amount: true, category: true, description: true },
      }),
    ]);

    // ── Revenue by method ──────────────────────────────────────────────────────
    const methodTotals: Record<string, number> = {};
    let paymentRevenue = 0;

    for (const pmt of payments) {
      const amt = Number(pmt.amount);
      paymentRevenue += amt;
      methodTotals[pmt.provider] = (methodTotals[pmt.provider] ?? 0) + amt;
    }

    // Fallback: when no captured Payment records exist (cash-only day), use paidAmount
    const aptPaidRevenue = completedApts.reduce((s, a) => s + Number(a.paidAmount), 0);
    const totalRevenue   = paymentRevenue > 0 ? paymentRevenue : aptPaidRevenue;

    const totalRefunded = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const netRevenue    = totalRevenue - totalRefunded;

    // ── Discounts ─────────────────────────────────────────────────────────────
    const totalDiscounts = completedApts.reduce((s, a) => s + Number(a.discountAmount ?? 0), 0);

    // ── Expenses ──────────────────────────────────────────────────────────────
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const expensesByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount);
    }

    // ── Outstanding balances ───────────────────────────────────────────────────
    const totalOutstanding = unpaidApts.reduce((s, a) => {
      const balance = Number(a.totalPrice) - Number(a.paidAmount);
      return s + balance;
    }, 0);

    // ── Net profit ────────────────────────────────────────────────────────────
    const netProfit = netRevenue - totalExpenses;

    // ── Specialist breakdown ───────────────────────────────────────────────────
    const specMap = new Map<string, { name: string; revenue: number; count: number }>();
    for (const apt of completedApts) {
      const specName = apt.specialist?.user
        ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`
        : 'Неизвестно';
      const paid = Number(apt.paidAmount);
      const existing = specMap.get(specName);
      if (existing) { existing.revenue += paid; existing.count++; }
      else specMap.set(specName, { name: specName, revenue: paid, count: 1 });
    }

    return ok({
      date: resolvedDate,
      revenue: {
        total:       Math.round(totalRevenue * 100) / 100,
        byCash:      Math.round((methodTotals['CASH'] ?? 0) * 100) / 100,
        byCard:      Math.round((methodTotals['CARD_TERMINAL'] ?? 0) * 100) / 100,
        byTransfer:  Math.round((methodTotals['TRANSFER'] ?? 0) * 100) / 100,
        byOnline:    Math.round(((methodTotals['YOOKASSA'] ?? 0) + (methodTotals['ROBOKASSA'] ?? 0)) * 100) / 100,
        byMethods:   Object.fromEntries(
          Object.entries(methodTotals).map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ),
      },
      refunds: {
        total: Math.round(totalRefunded * 100) / 100,
        count: refunds.length,
        items: refunds.map((r) => ({ id: r.id, amount: Number(r.amount), reason: r.reason })),
      },
      discounts: {
        total: Math.round(totalDiscounts * 100) / 100,
      },
      expenses: {
        total:       Math.round(totalExpenses * 100) / 100,
        byCategory:  Object.fromEntries(
          Object.entries(expensesByCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ),
        items: expenses.map((e) => ({ id: e.id, amount: Number(e.amount), category: e.category, description: e.description })),
      },
      netRevenue:   Math.round(netRevenue * 100) / 100,
      netProfit:    Math.round(netProfit * 100) / 100,
      outstanding: {
        total: Math.round(totalOutstanding * 100) / 100,
        count: unpaidApts.length,
        items: unpaidApts.map((a) => ({
          id:            a.id,
          paymentStatus: a.paymentStatus,
          totalPrice:    Number(a.totalPrice),
          paidAmount:    Number(a.paidAmount),
          balance:       Math.round((Number(a.totalPrice) - Number(a.paidAmount)) * 100) / 100,
          client:        a.client ? `${a.client.firstName} ${a.client.lastName}` : null,
        })),
      },
      completedBookings: completedApts.length,
      paymentCount:      payments.length,
      specialistBreakdown: [...specMap.values()].sort((a, b) => b.revenue - a.revenue),
    });
  } catch (err) {
    console.error('[finance/closing]', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate closing report', 500);
  }
}
