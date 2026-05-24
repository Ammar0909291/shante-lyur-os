export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

// ─── GET /api/finance/reconciliation ─────────────────────────────────────────
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to last 30 days)

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p    = req.nextUrl.searchParams;
  const from = p.get('from') ? new Date(p.get('from')! + 'T00:00:00Z') : new Date(Date.now() - 30 * 86_400_000);
  const to   = p.get('to')   ? new Date(p.get('to')!   + 'T23:59:59Z') : new Date();

  console.log('[finance/reconciliation]', { from, to });

  try {
    const [completedApts, payments, refunds] = await Promise.all([
      // Expected revenue: all COMPLETED appointments in period
      prisma.appointment.findMany({
        where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
        select: {
          id: true,
          totalPrice: true,
          paidAmount: true,
          discountAmount: true,
          paymentStatus: true,
          checkedOutAt: true,
          client: { select: { firstName: true, lastName: true } },
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      // Actual payments received in period
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: from, lte: to } },
        select: { id: true, amount: true, provider: true, appointmentId: true, paidAt: true },
      }),
      // Refunds issued in period
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: from, lte: to } },
        select: { id: true, amount: true, paymentId: true, processedAt: true },
      }),
    ]);

    const expectedRevenue  = completedApts.reduce((s, a) => s + Number(a.totalPrice) - Number(a.discountAmount ?? 0), 0);
    const actualReceived   = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalRefunds     = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const netReceived      = actualReceived - totalRefunds;
    const outstanding      = expectedRevenue - netReceived;

    // Gap analysis: appointments with outstanding balance
    const gapItems = completedApts
      .filter((a) => a.paymentStatus !== 'PAID' && a.paymentStatus !== 'REFUNDED')
      .map((a) => ({
        id:            a.id,
        paymentStatus: a.paymentStatus,
        totalPrice:    Number(a.totalPrice),
        discountAmount: Number(a.discountAmount ?? 0),
        paidAmount:    Number(a.paidAmount),
        balance:       Math.round((Number(a.totalPrice) - Number(a.discountAmount ?? 0) - Number(a.paidAmount)) * 100) / 100,
        client:        a.client ? `${a.client.firstName} ${a.client.lastName}` : null,
        specialist:    a.specialist?.user
          ? `${a.specialist.user.firstName} ${a.specialist.user.lastName}`
          : null,
        checkedOutAt:  a.checkedOutAt,
      }));

    // Per-method breakdown
    const byMethod: Record<string, number> = {};
    for (const pmt of payments) {
      byMethod[pmt.provider] = (byMethod[pmt.provider] ?? 0) + Number(pmt.amount);
    }

    // Daily breakdown
    const dayMap = new Map<string, { expected: number; received: number; refunded: number }>();
    for (const apt of completedApts) {
      if (!apt.checkedOutAt) continue;
      const day = apt.checkedOutAt.toISOString().split('T')[0];
      const effective = Number(apt.totalPrice) - Number(apt.discountAmount ?? 0);
      const d = dayMap.get(day) ?? { expected: 0, received: 0, refunded: 0 };
      d.expected += effective;
      dayMap.set(day, d);
    }
    for (const pmt of payments) {
      if (!pmt.paidAt) continue;
      const day = pmt.paidAt.toISOString().split('T')[0];
      const d = dayMap.get(day) ?? { expected: 0, received: 0, refunded: 0 };
      d.received += Number(pmt.amount);
      dayMap.set(day, d);
    }
    for (const ref of refunds) {
      if (!ref.processedAt) continue;
      const day = ref.processedAt.toISOString().split('T')[0];
      const d = dayMap.get(day) ?? { expected: 0, received: 0, refunded: 0 };
      d.refunded += Number(ref.amount);
      dayMap.set(day, d);
    }

    const dailyBreakdown = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        expected:  Math.round(v.expected * 100) / 100,
        received:  Math.round(v.received * 100) / 100,
        refunded:  Math.round(v.refunded * 100) / 100,
        net:       Math.round((v.received - v.refunded) * 100) / 100,
        gap:       Math.round((v.expected - v.received + v.refunded) * 100) / 100,
      }));

    console.log('[finance/reconciliation] done', {
      expectedRevenue,
      actualReceived,
      outstanding,
      completedApts: completedApts.length,
    });

    return ok({
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        expectedRevenue: Math.round(expectedRevenue * 100) / 100,
        actualReceived:  Math.round(actualReceived * 100) / 100,
        refundsIssued:   Math.round(totalRefunds * 100) / 100,
        netReceived:     Math.round(netReceived * 100) / 100,
        outstanding:     Math.round(outstanding * 100) / 100,
        reconciled:      Math.abs(outstanding) < 0.01,
        completedBookings: completedApts.length,
        paymentCount:    payments.length,
        refundCount:     refunds.length,
      },
      byMethod: Object.fromEntries(
        Object.entries(byMethod).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ),
      dailyBreakdown,
      outstandingItems: gapItems,
    });
  } catch (err) {
    console.error('[finance/reconciliation]', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate reconciliation', 500);
  }
}
