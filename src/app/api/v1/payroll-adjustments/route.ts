export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const bodySchema = z.object({
  specialistId: z.string().uuid(),
  description: z.string().min(1).max(500),
  amount: z.number(), // positive = credit, negative = debit
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'periodMonth must be YYYY-MM'),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Validation failed', parsed.error.flatten());

  const { specialistId, description, amount, periodMonth } = parsed.data;

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { id: true },
  });
  if (!specialist) return R.notFound('Specialist not found');

  const entry = await prisma.payrollEntry.create({
    data: {
      specialistId,
      type: 'ADJUSTMENT',
      amount,
      periodMonth,
      description,
      entryStatus: 'pending',
      createdBy: userId,
    },
  });

  return R.created({
    id: entry.id,
    specialistId: entry.specialistId,
    description: entry.description,
    amount: Number(entry.amount),
    periodMonth: entry.periodMonth,
    createdAt: entry.createdAt,
  });
}
