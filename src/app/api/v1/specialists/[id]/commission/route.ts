export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

const bodySchema = z.object({
  appointmentId: z.string().uuid().optional(),
  commissionBasis: z.number().min(0).max(100),
  commissionAmount: z.number().min(0),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'periodMonth must be YYYY-MM'),
  description: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { id: specialistId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Validation failed', parsed.error.flatten());

  const { appointmentId, commissionBasis, commissionAmount, periodMonth, description } = parsed.data;

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { id: true },
  });
  if (!specialist) return R.notFound('Specialist not found');

  // Write PayrollEntry + update totalCommissionPending in one transaction
  const [entry] = await prisma.$transaction([
    prisma.payrollEntry.create({
      data: {
        specialistId,
        type: 'COMMISSION',
        amount: r2(commissionAmount),
        rate: r2(commissionBasis / 100),
        periodMonth,
        appointmentId: appointmentId ?? null,
        description: description ?? `Commission ${r2(commissionBasis)}% on sale`,
        entryStatus: 'pending',
        isManuallyEdited: false,
        createdBy: userId,
      },
    }),
    prisma.specialist.update({
      where: { id: specialistId },
      data: { totalCommissionPending: { increment: r2(commissionAmount) } },
    }),
  ]);

  return R.created({
    id: entry.id,
    specialistId: entry.specialistId,
    type: entry.type,
    amount: r2(Number(entry.amount)),
    commissionBasis,
    commissionAmount: r2(commissionAmount),
    periodMonth: entry.periodMonth,
    appointmentId: entry.appointmentId ?? null,
    entryStatus: entry.entryStatus,
  });
}
