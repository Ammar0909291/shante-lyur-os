export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

// ─── GET /api/finance/reports ─────────────────────────────────────────────────
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&type=revenue|profit|refunds|specialists|expenses|all

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p    = req.nextUrl.searchParams;
  const from = p.get('from') ? new Date(p.get('from')! + 'T00:00:00Z') : new Date(Date.now() - 30 * 86_400_000);
  const to   = p.get('to')   ? new Date(p.get('to')!   + 'T23:59:59Z') : new Date();
  void (p.get('type') ?? 'all'); // type filter reserved for future fine-grained report slicing

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
          specialist: {
            select: {
              id: true,
              commissionRate: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          services: {
            select: {
              service: { select: { id: true, name: true, category: true } },
              price: true,
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: from, lte: to } },
        select: { id: true, amount: true, provider: true, isDeposit: true, paidAt: true, appointmentId: true },
      }),
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: from, lte: to } },
        select: { id: true, amount: true, reason: true, processedAt: true, paymentId: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        select: { id: true, amount: true, category: true, description: true, date: true },
      }),
    ]);

    // ── Revenue ────────────────────────────────────────────────────────────────
    // Primary: captured payment records. Fallback: paidAmount on appointments
    // (cash-only salons that don't create Payment records still see correct revenue)
    const paymentRevenue    = payments.reduce((s, p) => s + Number(p.amount), 0);
    const aptPaidRevenue    = completedApts.reduce((s, a) => s + Number(a.paidAmount), 0);
    const totalRevenue      = paymentRevenue > 0 ? paymentRevenue : aptPaidRevenue;
    const totalRefunds      = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const totalDiscounts    = completedApts.reduce((s, a) => s + Number(a.discountAmount ?? 0), 0);
    const totalExpenses     = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netRevenue        = totalRevenue - totalRefunds;
    const grossProfit       = netRevenue - totalDiscounts;
    const netProfit         = grossProfit - totalExpenses;

    // ── Consumable cost (from inventory usage) ────────────────────────────────
    const aptIds = completedApts.map((a) => a.id);
    const consumableCost = aptIds.length > 0
      ? await prisma.stockMovement.aggregate({
          where: { type: 'USAGE', appointmentId: { in: aptIds } },
          _sum: { quantity: true },
        }).then(async (_r) => {
          // approximate cost: use inventory analytics approach
          const usageMovements = await prisma.stockMovement.findMany({
            where: { type: 'USAGE', appointmentId: { in: aptIds } },
            select: { quantity: true, item: { select: { costPerUnit: true } } },
          });
          return usageMovements.reduce((s, mv) => {
            const cpu = mv.item.costPerUnit ? Number(mv.item.costPerUnit) : 0;
            return s + Math.abs(Number(mv.quantity)) * cpu;
          }, 0);
        })
      : 0;

    const trueNetProfit = netProfit - consumableCost;

    // ── By payment method ──────────────────────────────────────────────────────
    const byMethod: Record<string, number> = {};
    for (const pmt of payments) {
      byMethod[pmt.provider] = (byMethod[pmt.provider] ?? 0) + Number(pmt.amount);
    }

    // ── By specialist ──────────────────────────────────────────────────────────
    const specMap = new Map<string, {
      name: string; revenue: number; commissionEarned: number; refunds: number; count: number; avgCheck: number;
    }>();
    for (const apt of completedApts) {
      if (!apt.specialist) continue;
      const specId   = apt.specialist.id;
      const specName = `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`;
      const revenue  = Number(apt.paidAmount);
      const commission = revenue * Number(apt.specialist.commissionRate);
      const existing = specMap.get(specId);
      if (existing) {
        existing.revenue += revenue;
        existing.commissionEarned += commission;
        existing.count++;
      } else {
        specMap.set(specId, { name: specName, revenue, commissionEarned: commission, refunds: 0, count: 1, avgCheck: 0 });
      }
    }

    // Attach refunds to specialists
    const aptToSpec = new Map(completedApts.map((a) => [a.id, a.specialist?.id]));
    for (const ref of refunds) {
      const pmt = payments.find((p) => p.id === ref.paymentId);
      if (!pmt) continue;
      const specId = aptToSpec.get(pmt.appointmentId);
      if (!specId) continue;
      const existing = specMap.get(specId);
      if (existing) existing.refunds += Number(ref.amount);
    }

    const specialistReport = [...specMap.entries()].map(([id, v]) => ({
      id,
      name:             v.name,
      revenue:          Math.round(v.revenue * 100) / 100,
      refunds:          Math.round(v.refunds * 100) / 100,
      netRevenue:       Math.round((v.revenue - v.refunds) * 100) / 100,
      commissionEarned: Math.round(v.commissionEarned * 100) / 100,
      procedureCount:   v.count,
      avgCheck:         v.count > 0 ? Math.round(v.revenue / v.count * 100) / 100 : 0,
    })).sort((a, b) => b.netRevenue - a.netRevenue);

    // ── By service ─────────────────────────────────────────────────────────────
    const serviceMap = new Map<string, { name: string; category: string; revenue: number; count: number }>();
    for (const apt of completedApts) {
      for (const { service, price } of apt.services) {
        const existing = serviceMap.get(service.id);
        if (existing) {
          existing.revenue += Number(price);
          existing.count++;
        } else {
          serviceMap.set(service.id, { name: service.name, category: service.category, revenue: Number(price), count: 1 });
        }
      }
    }
    const serviceReport = [...serviceMap.entries()].map(([id, v]) => ({
      id,
      name:     v.name,
      category: v.category,
      revenue:  Math.round(v.revenue * 100) / 100,
      count:    v.count,
      avgPrice: v.count > 0 ? Math.round(v.revenue / v.count * 100) / 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // ── Expense report ─────────────────────────────────────────────────────────
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + Number(e.amount);
    }

    // ── Unpaid balance report ─────────────────────────────────────────────────
    const unpaidApts = await prisma.appointment.findMany({
      where: {
        paymentStatus: { in: ['UNPAID', 'DEPOSIT_PAID', 'PARTIAL_PAID'] },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        totalPrice: true,
        paidAmount: true,
        discountAmount: true,
        paymentStatus: true,
        startAt: true,
        client: { select: { firstName: true, lastName: true } },
      },
    });

    const totalOutstanding = unpaidApts.reduce((s, a) => {
      return s + Number(a.totalPrice) - Number(a.discountAmount ?? 0) - Number(a.paidAmount);
    }, 0);

    return ok({
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalRevenue:     Math.round(totalRevenue * 100) / 100,
        totalRefunds:     Math.round(totalRefunds * 100) / 100,
        totalDiscounts:   Math.round(totalDiscounts * 100) / 100,
        netRevenue:       Math.round(netRevenue * 100) / 100,
        totalExpenses:    Math.round(totalExpenses * 100) / 100,
        consumableCost:   Math.round(consumableCost * 100) / 100,
        grossProfit:      Math.round(grossProfit * 100) / 100,
        netProfit:        Math.round(trueNetProfit * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        completedBookings: completedApts.length,
        avgCheck: completedApts.length > 0
          ? Math.round(totalRevenue / completedApts.length * 100) / 100
          : 0,
      },
      byPaymentMethod: Object.fromEntries(
        Object.entries(byMethod).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ),
      specialists: specialistReport,
      services:    serviceReport,
      expenses: {
        total:      Math.round(totalExpenses * 100) / 100,
        byCategory: Object.fromEntries(
          Object.entries(expenseByCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ),
        items: expenses.map((e) => ({
          id:          e.id,
          date:        e.date.toISOString().split('T')[0],
          category:    e.category,
          amount:      Number(e.amount),
          description: e.description,
        })),
      },
      refunds: {
        total: Math.round(totalRefunds * 100) / 100,
        count: refunds.length,
      },
      unpaidBalances: {
        total: Math.round(totalOutstanding * 100) / 100,
        count: unpaidApts.length,
      },
    });
  } catch (err) {
    console.error('[finance/reports]', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate report', 500);
  }
}
