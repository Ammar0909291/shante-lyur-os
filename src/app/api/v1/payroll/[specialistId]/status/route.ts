export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES       = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const SUPER_ADMIN_ROLES = ['SUPER_ADMIN'];

const bodySchema = z.object({
  status: z.enum(['APPROVED', 'PAID']),
  from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { specialistId: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { specialistId } = params;

  let body: unknown;
  try { body = await req.json(); } catch { return R.badRequest('Invalid JSON body'); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Validation failed', parsed.error.flatten());

  const { status, from, to } = parsed.data;

  if (status === 'PAID' && !SUPER_ADMIN_ROLES.includes(role)) {
    return R.forbidden('Only Super Admin can mark payroll as PAID');
  }

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { id: true },
  });
  if (!specialist) return R.notFound('Specialist not found');

  const dateFrom = new Date(from);
  const dateTo   = new Date(to + 'T23:59:59');

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      specialistId,
      periodStart: { gte: dateFrom },
      periodEnd:   { lte: dateTo   },
    },
  });
  if (!period) return R.notFound('PayrollPeriod not found for the given range');

  const now            = new Date();
  const periodMonthStr = from.substring(0, 7);

  const updateData: {
    status: 'APPROVED' | 'PAID';
    approvedAt?: Date;
    approvedBy?: string;
    paidAt?: Date;
  } = { status };

  if (status === 'APPROVED') {
    updateData.approvedAt = now;
    updateData.approvedBy = userId;
  } else if (status === 'PAID') {
    if (!period.approvedAt) {
      updateData.approvedAt = now;
      updateData.approvedBy = userId;
    }
    updateData.paidAt = now;
  }

  // ── Run everything in a transaction ────────────────────────────────────────
  const updatedPeriod = await prisma.$transaction(async (tx) => {
    const updated = await tx.payrollPeriod.update({
      where: { id: period.id },
      data:  updateData,
    });

    if (status === 'APPROVED') {
      // Mark all COMMISSION PayrollEntry records in this period as approved
      await tx.payrollEntry.updateMany({
        where: {
          specialistId,
          periodMonth: periodMonthStr,
          type:        'COMMISSION',
        },
        data: { entryStatus: 'approved' },
      });

      // Sync specialist aggregate counters:
      // Move pending commission → approved
      const commEntries = await tx.payrollEntry.findMany({
        where: {
          specialistId,
          periodMonth: periodMonthStr,
          type:        'COMMISSION',
        },
        select: { amount: true },
      });
      const totalCommAmt = commEntries.reduce((s, e) => s + Number(e.amount), 0);

      if (totalCommAmt > 0) {
        await tx.specialist.update({
          where: { id: specialistId },
          data: {
            totalCommissionPending:  { decrement: totalCommAmt },
            totalCommissionApproved: { increment: totalCommAmt },
          },
        });
      }
    }

    if (status === 'PAID') {
      // Lock all PayrollEntry records
      await tx.payrollEntry.updateMany({
        where: { specialistId, periodMonth: periodMonthStr },
        data:  { isLocked: true },
      });

      // Move approved commission → paid
      const commEntries = await tx.payrollEntry.findMany({
        where: {
          specialistId,
          periodMonth: periodMonthStr,
          type:        'COMMISSION',
        },
        select: { amount: true },
      });
      const totalCommAmt = commEntries.reduce((s, e) => s + Number(e.amount), 0);

      if (totalCommAmt > 0) {
        await tx.specialist.update({
          where: { id: specialistId },
          data: {
            totalCommissionApproved: { decrement: totalCommAmt },
            totalCommissionPaid:     { increment: totalCommAmt },
          },
        });
      }
    }

    return updated;
  });

  return R.success({
    id:              updatedPeriod.id,
    specialistId:    updatedPeriod.specialistId,
    periodStart:     updatedPeriod.periodStart,
    periodEnd:       updatedPeriod.periodEnd,
    baseSalary:      Number(updatedPeriod.baseSalary),
    totalCommission: Number(updatedPeriod.totalCommission),
    totalBonus:      Number(updatedPeriod.totalBonus),
    totalDeduction:  Number(updatedPeriod.totalDeduction),
    totalAdjustment: Number(updatedPeriod.totalAdjustment),
    totalPayable:    Number(updatedPeriod.totalPayable),
    status:          updatedPeriod.status,
    approvedAt:      updatedPeriod.approvedAt ?? null,
    approvedBy:      updatedPeriod.approvedBy ?? null,
    paidAt:          updatedPeriod.paidAt     ?? null,
  });
}
