export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

const VALID_COMMISSION_TYPES = ['STANDARD_SALE','NEW_CLIENT','RETURNING_CLIENT','UPSELL','REFERRAL','TARGET_BONUS','QUALITY_BONUS','CUSTOM'] as const;

const bodySchema = z.object({
  type: z.enum(['BONUS', 'DEDUCTION', 'ADJUSTMENT']),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\d{4}-\d{2}$/, 'periodMonth must be YYYY-MM or YYYY-MM-DD'),
  commissionType: z.enum(VALID_COMMISSION_TYPES).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { specialistId: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { specialistId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Validation failed', parsed.error.flatten());

  const { type, amount, description, commissionType } = parsed.data;
  // Normalize periodMonth to YYYY-MM
  const periodMonth = parsed.data.periodMonth.slice(0, 7);

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { id: true },
  });
  if (!specialist) return R.notFound('Specialist not found');

  // Store deductions as negative amounts
  const storedAmount = type === 'DEDUCTION' ? -Math.abs(amount) : amount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = await (prisma.payrollEntry.create as any)({
    data: {
      specialistId,
      type,
      amount: storedAmount,
      periodMonth,
      description,
      commissionType: commissionType ?? null,
      createdBy: userId,
    },
  }) as Awaited<ReturnType<typeof prisma.payrollEntry.create>>;

  // Recompute and upsert PayrollPeriod totals for the affected period
  const allEntries = await prisma.payrollEntry.findMany({
    where: { specialistId, periodMonth },
    select: { type: true, amount: true },
  });

  let baseSalary = 0;
  let totalCommission = 0;
  let totalBonus = 0;
  let totalDeduction = 0;
  let totalAdjustment = 0;

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

  // Derive approximate period dates from periodMonth
  const [yearStr, monthStr] = periodMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 0); // last day of month

  const existingPeriod = await prisma.payrollPeriod.findFirst({
    where: {
      specialistId,
      periodStart: { gte: new Date(year, month, 1) },
      periodEnd: { lte: new Date(year, month + 1, 0, 23, 59, 59) },
    },
  });

  if (existingPeriod) {
    await prisma.payrollPeriod.update({
      where: { id: existingPeriod.id },
      data: {
        baseSalary: r2(baseSalary),
        totalCommission: r2(totalCommission),
        totalBonus: r2(totalBonus),
        totalDeduction: r2(totalDeduction),
        totalAdjustment: r2(totalAdjustment),
        totalPayable,
      },
    });
  } else {
    await prisma.payrollPeriod.upsert({
      where: {
        specialistId_periodStart_periodEnd: {
          specialistId,
          periodStart,
          periodEnd,
        },
      },
      update: {
        baseSalary: r2(baseSalary),
        totalCommission: r2(totalCommission),
        totalBonus: r2(totalBonus),
        totalDeduction: r2(totalDeduction),
        totalAdjustment: r2(totalAdjustment),
        totalPayable,
      },
      create: {
        specialistId,
        periodStart,
        periodEnd,
        baseSalary: r2(baseSalary),
        totalCommission: r2(totalCommission),
        totalBonus: r2(totalBonus),
        totalDeduction: r2(totalDeduction),
        totalAdjustment: r2(totalAdjustment),
        totalPayable,
        status: 'PENDING',
      },
    });
  }

  return R.created({
    id: entry.id,
    specialistId: entry.specialistId,
    type: entry.type,
    amount: r2(Number(entry.amount)),
    description: entry.description ?? null,
    periodMonth: entry.periodMonth,
    isLocked: entry.isLocked,
    createdBy: entry.createdBy ?? null,
    createdAt: entry.createdAt,
    updatedTotals: {
      baseSalary: r2(baseSalary),
      totalCommission: r2(totalCommission),
      totalBonus: r2(totalBonus),
      totalDeduction: r2(totalDeduction),
      totalAdjustment: r2(totalAdjustment),
      totalPayable,
    },
  });
}
