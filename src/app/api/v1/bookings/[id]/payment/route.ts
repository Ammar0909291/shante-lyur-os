export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  const payment = await prisma.payment.findFirst({
    where:   { appointmentId: params.id, status: 'CAPTURED' },
    select: {
      id:              true,
      amount:          true,
      currency:        true,
      provider:        true,
      status:          true,
      paidAt:          true,
      refunds: {
        where:   { status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] } },
        select:  { id: true, amount: true, status: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!payment) return R.notFound('No captured payment for this booking');

  const refundedAmount = payment.refunds
    .filter((r) => r.status === 'COMPLETED')
    .reduce((s, r) => s + r.amount.toNumber(), 0);

  return R.success({
    id:             payment.id,
    amount:         payment.amount.toNumber(),
    currency:       payment.currency,
    provider:       payment.provider,
    status:         payment.status,
    paidAt:         payment.paidAt?.toISOString() ?? null,
    refundedAmount,
    refundableAmount: Math.max(0, payment.amount.toNumber() - refundedAmount),
    refunds:        payment.refunds.map((r) => ({
      id:        r.id,
      amount:    r.amount.toNumber(),
      status:    r.status,
      reason:    r.reason ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
