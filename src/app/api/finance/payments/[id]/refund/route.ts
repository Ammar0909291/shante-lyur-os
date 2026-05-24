export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

const RefundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

interface Ctx { params: Promise<{ id: string }> }

// ─── POST /api/finance/payments/[id]/refund ───────────────────────────────────

export async function POST(req: NextRequest, ctx: Ctx) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id: paymentId } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }

  const parsed = RefundSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body', 400);

  const { amount, reason } = parsed.data;

  console.log('[finance/refund POST]', { paymentId, amount, userId });

  try {
    const pmt = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        refunds: { where: { status: 'COMPLETED' } },
        appointment: {
          select: {
            id: true,
            totalPrice: true,
            paidAmount: true,
            paymentStatus: true,
            discountAmount: true,
          },
        },
      },
    });

    if (!pmt) return apiError('NOT_FOUND', 'Payment not found', 404);
    if (pmt.status === 'CANCELLED' || pmt.status === 'FAILED') {
      return apiError('INVALID_STATE', `Cannot refund a ${pmt.status} payment`, 400);
    }

    const alreadyRefunded = pmt.refunds.reduce((s, r) => s + Number(r.amount), 0);
    const refundable      = Number(pmt.amount) - alreadyRefunded;

    // Prevent double-full-refund (check before REFUND_EXCEEDS_AMOUNT so error is more specific)
    if (alreadyRefunded >= Number(pmt.amount) - 0.01) {
      return apiError('ALREADY_REFUNDED', 'Payment has already been fully refunded', 400);
    }

    if (amount > refundable + 0.01) {
      return apiError(
        'REFUND_EXCEEDS_AMOUNT',
        `Refund amount (${amount}) exceeds refundable amount (${refundable.toFixed(2)})`,
        400,
      );
    }

    const isFullRefund     = amount >= refundable - 0.01;
    const newPaymentStatus = isFullRefund ? 'FULLY_REFUNDED' : 'PARTIALLY_REFUNDED';

    // Calculate appointment paid amount after refund
    const apt = pmt.appointment;
    const aptNewPaidAmount = apt ? Math.max(0, Number(apt.paidAmount) - amount) : 0;
    const aptEffectiveTotal = apt ? Number(apt.totalPrice) - Number(apt.discountAmount ?? 0) : 0;
    let aptNewPaymentStatus: string = apt?.paymentStatus ?? 'UNPAID';
    if (apt) {
      if (aptNewPaidAmount <= 0.01) {
        aptNewPaymentStatus = 'REFUNDED';
      } else if (aptNewPaidAmount < aptEffectiveTotal - 0.01) {
        aptNewPaymentStatus = 'PARTIAL_PAID';
      }
    }

    let refund!: { id: string; amount: unknown; status: string; reason: string | null; processedAt: Date | null; createdAt: Date };

    await prisma.$transaction(async (tx) => {
      refund = await tx.refund.create({
        data: {
          paymentId,
          amount,
          reason:      reason ?? null,
          status:      'COMPLETED',
          processedAt: new Date(),
          processedBy: userId ?? undefined,
        },
        select: { id: true, amount: true, status: true, reason: true, processedAt: true, createdAt: true },
      });

      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data:  { status: newPaymentStatus as never },
      });

      // Update appointment paid amount + payment status
      if (apt) {
        await tx.appointment.update({
          where: { id: apt.id },
          data: {
            paidAmount:    aptNewPaidAmount,
            paymentStatus: aptNewPaymentStatus as never,
          },
        });
      }

      // Audit trail
      await tx.auditLog.create({
        data: {
          userId,
          appointmentId: apt?.id ?? null,
          action:     'REFUND_ISSUED',
          entityType: 'Refund',
          entityId:   refund.id,
          oldValues:  { paymentStatus: pmt.status, paidAmount: apt?.paidAmount },
          newValues:  { refundAmount: amount, reason, newPaymentStatus, aptNewPaymentStatus, aptNewPaidAmount },
        },
      });
    });

    console.log('[finance/refund POST] done', { refundId: refund.id, newPaymentStatus, aptNewPaymentStatus });

    return ok(
      {
        refund: {
          id:          refund.id,
          amount:      Number(refund.amount),
          status:      refund.status,
          reason:      refund.reason,
          processedAt: refund.processedAt,
          createdAt:   refund.createdAt,
        },
        payment: {
          id:     paymentId,
          status: newPaymentStatus,
        },
        appointment: apt
          ? { id: apt.id, paidAmount: aptNewPaidAmount, paymentStatus: aptNewPaymentStatus }
          : null,
      },
      201,
    );
  } catch (err) {
    console.error('[finance/refund POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to process refund', 500);
  }
}
