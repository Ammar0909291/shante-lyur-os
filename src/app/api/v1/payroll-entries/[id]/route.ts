export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

const patchSchema = z.object({
  commissionBasis: z.number().min(0).max(100).optional(),
  commissionAmount: z.number().min(0).optional(),
  entryStatus: z.enum(['pending', 'approved']).optional(),
  entryNotes: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { id } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Validation failed', parsed.error.flatten());

  const { commissionBasis, commissionAmount, entryStatus, entryNotes } = parsed.data;

  const existing = await prisma.payrollEntry.findUnique({ where: { id } });
  if (!existing) return R.notFound('Payroll entry not found');
  if (existing.isLocked) return R.badRequest('Entry is locked and cannot be edited');

  const updateData: Record<string, unknown> = {};

  if (commissionAmount !== undefined) {
    updateData.amount = r2(commissionAmount);
    updateData.isManuallyEdited = true;
    // Move pending commission delta on specialist
    const delta = r2(commissionAmount - Number(existing.amount));
    if (delta !== 0) {
      await prisma.specialist.update({
        where: { id: existing.specialistId },
        data: { totalCommissionPending: { increment: delta } },
      });
    }
  }

  if (commissionBasis !== undefined && !updateData.isManuallyEdited) {
    updateData.rate = r2(commissionBasis / 100);
    // Recalculate amount from rate if not manually set
    const saleTotal = 0; // sale total not directly available here; skip auto-recalc
    void saleTotal;
  } else if (commissionBasis !== undefined) {
    updateData.rate = r2(commissionBasis / 100);
  }

  if (entryStatus !== undefined) {
    const prevStatus = existing.entryStatus;
    updateData.entryStatus = entryStatus;
    const amount = Number(existing.amount);
    if (prevStatus === 'pending' && entryStatus === 'approved') {
      await prisma.specialist.update({
        where: { id: existing.specialistId },
        data: {
          totalCommissionPending: { decrement: amount },
          totalCommissionApproved: { increment: amount },
        },
      });
    } else if (prevStatus === 'approved' && entryStatus === 'pending') {
      await prisma.specialist.update({
        where: { id: existing.specialistId },
        data: {
          totalCommissionApproved: { decrement: amount },
          totalCommissionPending: { increment: amount },
        },
      });
    }
  }

  if (entryNotes !== undefined) {
    updateData.entryNotes = entryNotes;
  }

  const updated = await prisma.payrollEntry.update({
    where: { id },
    data: updateData,
  });

  return R.success({
    id: updated.id,
    specialistId: updated.specialistId,
    type: updated.type,
    amount: r2(Number(updated.amount)),
    rate: updated.rate !== null ? Number(updated.rate) : null,
    entryStatus: updated.entryStatus,
    entryNotes: updated.entryNotes ?? null,
    isManuallyEdited: updated.isManuallyEdited,
    periodMonth: updated.periodMonth,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  void userId;

  const { id } = params;

  const existing = await prisma.payrollEntry.findUnique({ where: { id } });
  if (!existing) return R.notFound('Payroll entry not found');
  if (existing.isLocked) return R.badRequest('Entry is locked and cannot be deleted');

  // Only ADJUSTMENT and COMMISSION entries (manual) can be deleted
  if (!['ADJUSTMENT', 'COMMISSION', 'BONUS', 'DEDUCTION'].includes(existing.type)) {
    return R.badRequest('BASE_SALARY entries cannot be deleted');
  }

  // Reverse commission aggregate
  if (existing.type === 'COMMISSION') {
    const amount = Number(existing.amount);
    if (existing.entryStatus === 'pending') {
      await prisma.specialist.update({
        where: { id: existing.specialistId },
        data: { totalCommissionPending: { decrement: amount } },
      });
    } else if (existing.entryStatus === 'approved') {
      await prisma.specialist.update({
        where: { id: existing.specialistId },
        data: { totalCommissionApproved: { decrement: amount } },
      });
    }
  }

  await prisma.payrollEntry.delete({ where: { id } });

  return R.noContent();
}
