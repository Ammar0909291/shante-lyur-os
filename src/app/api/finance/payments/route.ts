export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

const CreateSchema = z.object({
  appointmentId: z.string().uuid(),
  provider:      z.enum(['CASH', 'CARD_TERMINAL', 'TRANSFER', 'YOOKASSA', 'ROBOKASSA', 'INTERNAL']),
  amount:        z.number().positive(),
  isDeposit:     z.boolean().optional().default(false),
  description:   z.string().max(255).optional(),
  idempotencyKey: z.string().max(255).optional(),
});

// ─── GET /api/finance/payments ────────────────────────────────────────────────
// Query: appointmentId?, status?, from?, to?, page?, limit?

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p = req.nextUrl.searchParams;
  const appointmentId = p.get('appointmentId');
  const status        = p.get('status');
  const from          = p.get('from');
  const to            = p.get('to');
  const page          = Math.max(1, Number(p.get('page') ?? '1'));
  const limit         = Math.min(100, Math.max(1, Number(p.get('limit') ?? '50')));

  try {
    const where: Record<string, unknown> = {};
    if (appointmentId) where.appointmentId = appointmentId;
    if (status)        where.status = status;
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to)   createdAt.lte = new Date(to + 'T23:59:59Z');
      where.createdAt = createdAt;
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          appointment: {
            select: {
              id: true,
              totalPrice: true,
              paidAmount: true,
              paymentStatus: true,
              discountAmount: true,
              status: true,
              client: { select: { firstName: true, lastName: true } },
              specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
          },
          refunds: { select: { id: true, amount: true, status: true, reason: true, processedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mapped = payments.map((pmt) => ({
      id:           pmt.id,
      appointmentId: pmt.appointmentId,
      provider:     pmt.provider,
      amount:       Number(pmt.amount),
      currency:     pmt.currency,
      status:       pmt.status,
      isDeposit:    pmt.isDeposit,
      description:  pmt.description,
      paidAt:       pmt.paidAt,
      createdAt:    pmt.createdAt,
      appointment:  pmt.appointment
        ? {
            id:            pmt.appointment.id,
            status:        pmt.appointment.status,
            paymentStatus: pmt.appointment.paymentStatus,
            totalPrice:    Number(pmt.appointment.totalPrice),
            paidAmount:    Number(pmt.appointment.paidAmount),
            discountAmount: pmt.appointment.discountAmount ? Number(pmt.appointment.discountAmount) : null,
            client:        pmt.appointment.client
              ? `${pmt.appointment.client.firstName} ${pmt.appointment.client.lastName}`
              : null,
            specialist:    pmt.appointment.specialist?.user
              ? `${pmt.appointment.specialist.user.firstName} ${pmt.appointment.specialist.user.lastName}`
              : null,
          }
        : null,
      refunds: pmt.refunds.map((r) => ({
        id:          r.id,
        amount:      Number(r.amount),
        status:      r.status,
        reason:      r.reason,
        processedAt: r.processedAt,
      })),
      totalRefunded: pmt.refunds
        .filter((r) => r.status === 'COMPLETED')
        .reduce((s, r) => s + Number(r.amount), 0),
    }));

    return ok({ payments: mapped, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[finance/payments GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch payments', 500);
  }
}

// ─── POST /api/finance/payments ───────────────────────────────────────────────
// Create a new payment and update appointment payment status atomically.

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body', 400);

  const { appointmentId, provider, amount, isDeposit, description, idempotencyKey } = parsed.data;

  console.log('[finance/payments POST]', { appointmentId, provider, amount, isDeposit, userId });

  try {
    // Idempotency: reject duplicate key
    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return ok({ payment: existing, duplicate: true });
      }
    }

    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        totalPrice: true,
        paidAmount: true,
        discountAmount: true,
        paymentStatus: true,
        status: true,
        clientId: true,
        specialistId: true,
        locationId: true,
      },
    });
    if (!apt) return apiError('NOT_FOUND', 'Appointment not found', 404);

    const totalPrice  = Number(apt.totalPrice);
    const discount    = Number(apt.discountAmount ?? 0);
    const effectiveTotal = totalPrice - discount;
    const currentPaid = Number(apt.paidAmount);
    const remaining   = effectiveTotal - currentPaid;

    if (amount > remaining + 0.01) {
      return apiError(
        'OVERPAYMENT',
        `Payment amount (${amount}) exceeds remaining balance (${remaining.toFixed(2)})`,
        400,
      );
    }

    const newPaidAmount = currentPaid + amount;
    const newRemaining  = effectiveTotal - newPaidAmount;

    // Determine appointment payment status
    let newPaymentStatus: string;
    if (newRemaining <= 0.01) {
      newPaymentStatus = 'PAID';
    } else if (isDeposit && currentPaid === 0) {
      newPaymentStatus = 'DEPOSIT_PAID';
    } else {
      newPaymentStatus = 'PARTIAL_PAID';
    }

    let payment!: { id: string; amount: unknown; status: string; provider: string; isDeposit: boolean; paidAt: Date | null; createdAt: Date };

    await prisma.$transaction(async (tx) => {
      payment = await tx.payment.create({
        data: {
          appointmentId,
          provider:           provider as never,
          amount,
          status:             'CAPTURED',
          isDeposit,
          description:        description ?? null,
          idempotencyKey:     idempotencyKey ?? null,
          paidAt:             new Date(),
          processedByUserId:  userId ?? null,
        },
        select: { id: true, amount: true, status: true, provider: true, isDeposit: true, paidAt: true, createdAt: true },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          paidAmount:    newPaidAmount,
          paymentStatus: newPaymentStatus as never,
        },
      });

      // Revenue record for financial analytics
      await tx.revenueRecord.create({
        data: {
          date:          new Date(),
          type:          'SERVICE_PAYMENT',
          amount,
          paymentId:     payment.id,
          appointmentId,
          specialistId:  apt.specialistId,
          locationId:    apt.locationId,
        },
      });

      // Update client lifetime spend
      const clientProfile = await tx.customerProfile.findUnique({
        where:  { userId: apt.clientId },
        select: { id: true, totalSpent: true },
      });
      if (clientProfile) {
        await tx.customerProfile.update({
          where: { id: clientProfile.id },
          data: {
            totalSpent: Number(clientProfile.totalSpent) + amount,
            ...(newPaymentStatus === 'PAID' ? { lastVisitAt: new Date() } : {}),
          },
        });
      }

      // Auto-write commission PayrollEntry for specialist (idempotent)
      if (apt.specialistId) {
        const existingCommission = await tx.payrollEntry.findFirst({
          where: { paymentId: payment.id, type: 'COMMISSION' },
          select: { id: true },
        });
        if (!existingCommission) {
          const salaryConfig = await tx.specialistSalaryConfig.findUnique({
            where: { specialistId: apt.specialistId },
            select: { commissionRate: true },
          });
          const specialist = await tx.specialist.findUnique({
            where: { id: apt.specialistId },
            select: { commissionRate: true },
          });
          const rate =
            (salaryConfig?.commissionRate != null ? Number(salaryConfig.commissionRate) : null) ??
            (specialist?.commissionRate != null ? Number(specialist.commissionRate) : 0);
          const commissionAmount = Math.round(amount * rate * 100) / 100;
          const periodMonth = new Date().toISOString().substring(0, 7);

          await tx.payrollEntry.create({
            data: {
              specialistId:  apt.specialistId,
              paymentId:     payment.id,
              appointmentId,
              type:          'COMMISSION',
              amount:        commissionAmount,
              rate,
              periodMonth,
              description:   'Комиссия с продажи',
              isLocked:      false,
            },
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          appointmentId,
          action:     'PAYMENT_PROCESSED',
          entityType: 'Payment',
          entityId:   payment.id,
          newValues:  { amount, provider, isDeposit, newPaymentStatus, newPaidAmount },
        },
      });
    });

    console.log('[finance/payments POST] done', { paymentId: payment.id, newPaymentStatus, newPaidAmount });

    return ok(
      {
        payment: {
          id:         payment.id,
          amount:     Number(payment.amount),
          status:     payment.status,
          provider:   payment.provider,
          isDeposit:  payment.isDeposit,
          paidAt:     payment.paidAt,
          createdAt:  payment.createdAt,
        },
        appointment: {
          id:            appointmentId,
          paidAmount:    newPaidAmount,
          remaining:     Math.max(0, newRemaining),
          paymentStatus: newPaymentStatus,
        },
      },
      201,
    );
  } catch (err) {
    console.error('[finance/payments POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to create payment', 500);
  }
}
