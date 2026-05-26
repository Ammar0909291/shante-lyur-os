export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

function r2(n: number): number { return Math.round(n * 100) / 100; }

const patchSchema = z.object({
  rate:   z.number().min(0).max(100),
  amount: z.number().positive().optional(),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { specialistId: string; id: string } },
) {
  const { specialistId, id } = params;

  const entry = await prisma.payrollEntry.findFirst({
    where: { id, specialistId, type: 'BONUS' },
  });
  if (!entry) return err('Entry not found or cannot be deleted', 404);
  if (entry.isLocked) return err('Entry is locked', 403);

  await prisma.payrollEntry.delete({ where: { id } });
  return ok({ deleted: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { specialistId: string; id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return err('Unauthorized', 401);
  if (!ADMIN_ROLES.includes(role)) return err('Requires Admin role or above', 403);

  const { specialistId, id } = params;

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON body', 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err('Validation failed', 400);

  const { rate, amount: overrideAmount } = parsed.data;

  const entry = await prisma.payrollEntry.findFirst({
    where: { id, specialistId, type: 'COMMISSION' },
    include: { appointment: { select: { totalPrice: true } } },
  });
  if (!entry) return err('Commission entry not found', 404);
  if (entry.isLocked) return err('Entry is locked', 403);

  // Check PayrollPeriod not PAID (locked period)
  const [yearStr, monthStr] = entry.periodMonth.split('-');
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const periodLookup = await prisma.payrollPeriod.findFirst({
    where: {
      specialistId,
      periodStart: { gte: new Date(year, month, 1) },
      periodEnd:   { lte: new Date(year, month + 1, 0, 23, 59, 59) },
    },
    select: { status: true },
  });
  if (periodLookup?.status === 'PAID') {
    return err('Период закрыт для редактирования', 423);
  }

  // Fetch specialist userId for SaleCommissionEntry sync
  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { userId: true },
  });
  if (!specialist) return err('Specialist not found', 404);

  const saleTotal  = Number(entry.appointment?.totalPrice ?? 0);
  const newAmount  = r2(overrideAmount ?? saleTotal * (rate / 100));
  const newRateFraction = rate / 100; // stored as decimal fraction

  const originalData = {
    originalRate:   Number(entry.rate),
    originalAmount: Number(entry.amount),
    editedBy:       userId,
    editedAt:       new Date().toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    // Update PayrollEntry
    await (tx.payrollEntry.update as (args: object) => Promise<unknown>)({
      where: { id },
      data: {
        amount:          newAmount,
        rate:            newRateFraction,
        isManuallyEdited: true,
        edited:          true,
        editedBy:        userId,
        editedAt:        new Date(),
        originalData,
      },
    });

    // Sync SaleCommissionEntry if appointmentId is present
    if (entry.appointmentId) {
      await tx.saleCommissionEntry.updateMany({
        where: {
          appointmentId: entry.appointmentId,
          userId:        specialist.userId,
        },
        data: {
          commissionBasis:  rate,   // stored as percentage (e.g. 30)
          commissionAmount: newAmount,
          isManuallyEdited: true,
        },
      });
    }
  });

  // Recompute PayrollPeriod totals for the affected period
  const allEntries = await prisma.payrollEntry.findMany({
    where: { specialistId, periodMonth: entry.periodMonth },
    select: { type: true, amount: true },
  });

  let baseSalary = 0, totalCommission = 0, totalBonus = 0, totalDeduction = 0, totalAdjustment = 0;
  for (const e of allEntries) {
    const amt = Number(e.amount);
    switch (e.type) {
      case 'BASE_SALARY': baseSalary      += amt; break;
      case 'COMMISSION':  totalCommission += amt; break;
      case 'BONUS':       totalBonus      += amt; break;
      case 'DEDUCTION':   totalDeduction  += Math.abs(amt); break;
      case 'ADJUSTMENT':  totalAdjustment += amt; break;
    }
  }
  const totalPayable = r2(baseSalary + totalCommission + totalBonus - totalDeduction + totalAdjustment);

  const periodStart = new Date(year, month, 1);

  const existingPeriod = await prisma.payrollPeriod.findFirst({
    where: {
      specialistId,
      periodStart: { gte: periodStart },
      periodEnd:   { lte: new Date(year, month + 1, 0, 23, 59, 59) },
    },
  });

  if (existingPeriod) {
    await prisma.payrollPeriod.update({
      where: { id: existingPeriod.id },
      data: { baseSalary: r2(baseSalary), totalCommission: r2(totalCommission), totalBonus: r2(totalBonus), totalDeduction: r2(totalDeduction), totalAdjustment: r2(totalAdjustment), totalPayable },
    });
  }

  return ok({ id, amount: newAmount, rate: newRateFraction, edited: true });
}
