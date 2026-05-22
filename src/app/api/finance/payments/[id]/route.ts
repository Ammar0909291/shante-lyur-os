export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

interface Ctx { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await ctx.params;

  try {
    const pmt = await prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          select: {
            id: true,
            totalPrice: true,
            paidAmount: true,
            paymentStatus: true,
            discountAmount: true,
            discountReason: true,
            status: true,
            startAt: true,
            client: { select: { id: true, firstName: true, lastName: true, phone: true } },
            specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
            services: { select: { service: { select: { name: true } }, price: true } },
          },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, amount: true, status: true, reason: true, processedAt: true, processedBy: true, createdAt: true },
        },
      },
    });

    if (!pmt) return apiError('NOT_FOUND', 'Payment not found', 404);

    const totalRefunded = pmt.refunds
      .filter((r) => r.status === 'COMPLETED')
      .reduce((s, r) => s + Number(r.amount), 0);

    return ok({
      id:            pmt.id,
      appointmentId: pmt.appointmentId,
      provider:      pmt.provider,
      amount:        Number(pmt.amount),
      currency:      pmt.currency,
      status:        pmt.status,
      isDeposit:     pmt.isDeposit,
      description:   pmt.description,
      paidAt:        pmt.paidAt,
      createdAt:     pmt.createdAt,
      totalRefunded,
      netAmount:     Number(pmt.amount) - totalRefunded,
      appointment: pmt.appointment
        ? {
            id:            pmt.appointment.id,
            status:        pmt.appointment.status,
            paymentStatus: pmt.appointment.paymentStatus,
            totalPrice:    Number(pmt.appointment.totalPrice),
            paidAmount:    Number(pmt.appointment.paidAmount),
            discountAmount: pmt.appointment.discountAmount ? Number(pmt.appointment.discountAmount) : null,
            discountReason: pmt.appointment.discountReason,
            startAt:       pmt.appointment.startAt,
            client:        pmt.appointment.client,
            specialist:    pmt.appointment.specialist?.user
              ? `${pmt.appointment.specialist.user.firstName} ${pmt.appointment.specialist.user.lastName}`
              : null,
            services:      pmt.appointment.services.map((s) => ({
              name:  s.service.name,
              price: Number(s.price),
            })),
          }
        : null,
      refunds: pmt.refunds.map((r) => ({
        id:          r.id,
        amount:      Number(r.amount),
        status:      r.status,
        reason:      r.reason,
        processedAt: r.processedAt,
        processedBy: r.processedBy,
        createdAt:   r.createdAt,
      })),
    });
  } catch (err) {
    console.error('[finance/payments/:id GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch payment', 500);
  }
}
