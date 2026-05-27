export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

  const { from, to } = parsed.data;
  const dateFrom = new Date(from);
  const dateTo = new Date(to + 'T23:59:59');
  const periodMonthStr = from.substring(0, 7);

  const specialists = await prisma.specialist.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      commissionRate: true,
      salaryConfig: true,
    },
  });

  const specialistIds = specialists.map((s) => s.id);

  const [appointments, existingEntries] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        specialistId: { in: specialistIds },
        status: 'COMPLETED',
        startAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        specialistId: true,
        totalPrice: true,
        totalDuration: true,
        startAt: true,
      },
    }),
    prisma.payrollEntry.findMany({
      where: {
        specialistId: { in: specialistIds },
        periodMonth: periodMonthStr,
      },
      select: {
        id: true,
        specialistId: true,
        type: true,
        amount: true,
      },
    }),
  ]);

  // Group appointments by specialist
  type ApptRecord = { id: string; totalPrice: number; totalDuration: number; startAt: Date };
  const apptsBySpec = new Map<string, ApptRecord[]>();
  for (const sp of specialists) {
    apptsBySpec.set(sp.id, []);
  }
  for (const a of appointments) {
    apptsBySpec.get(a.specialistId)?.push({
      id: a.id,
      totalPrice: Number(a.totalPrice),
      totalDuration: a.totalDuration,
      startAt: a.startAt,
    });
  }

  // Group existing entries by specialist
  type EntryRecord = { id: string; type: string; amount: number };
  const entriesBySpec = new Map<string, EntryRecord[]>();
  for (const sp of specialists) {
    entriesBySpec.set(sp.id, []);
  }
  for (const e of existingEntries) {
    entriesBySpec.get(e.specialistId)?.push({ id: e.id, type: e.type, amount: Number(e.amount) });
  }

  const results: {
    specialistId: string;
    baseSalary: number;
    totalCommission: number;
    totalBonus: number;
    totalDeduction: number;
    totalAdjustment: number;
    totalPayable: number;
    status: string;
    periodId: string;
  }[] = [];

  for (const sp of specialists) {
    const cfg = sp.salaryConfig;
    const salaryType = cfg?.salaryType ?? 'FIXED';
    const fixedAmount = Number(cfg?.fixedAmount ?? 0);
    const hourlyRate = Number(cfg?.hourlyRate ?? 0);
    const shiftRate = Number(cfg?.shiftRate ?? 0);
    const commissionRate = Number(cfg?.commissionRate ?? sp.commissionRate ?? 0);

    const spAppts = apptsBySpec.get(sp.id) ?? [];
    const spEntries = entriesBySpec.get(sp.id) ?? [];

    // Calculate base salary
    let baseSalary = 0;
    if (salaryType === 'FIXED') {
      baseSalary = fixedAmount;
    } else if (salaryType === 'HOURLY') {
      const totalMinutes = spAppts.reduce((sum, a) => sum + a.totalDuration, 0);
      baseSalary = r2((totalMinutes / 60) * hourlyRate);
    } else if (salaryType === 'SHIFT') {
      const daySet = new Set(spAppts.map((a) => a.startAt.toISOString().substring(0, 10)));
      baseSalary = r2(daySet.size * shiftRate);
    } else if (salaryType === 'HYBRID') {
      baseSalary = fixedAmount;
    }

    // Upsert BASE_SALARY entry
    const existingBase = spEntries.find((e) => e.type === 'BASE_SALARY');
    if (existingBase) {
      await prisma.payrollEntry.update({
        where: { id: existingBase.id },
        data: { amount: baseSalary, createdBy: userId },
      });
    } else {
      await prisma.payrollEntry.create({
        data: {
          specialistId: sp.id,
          type: 'BASE_SALARY',
          amount: baseSalary,
          periodMonth: periodMonthStr,
          description: `Base salary (${salaryType})`,
          createdBy: userId,
        },
      });
    }

    // Sum all entries for this period (including just-upserted)
    const allEntries = await prisma.payrollEntry.findMany({
      where: { specialistId: sp.id, periodMonth: periodMonthStr },
      select: { type: true, amount: true },
    });

    let totalCommission = 0;
    let totalBonus = 0;
    let totalDeduction = 0;
    let totalAdjustment = 0;
    let computedBase = 0;
    for (const e of allEntries) {
      const amt = Number(e.amount);
      switch (e.type) {
        case 'BASE_SALARY':  computedBase     += amt; break;
        case 'COMMISSION':   totalCommission  += amt; break;
        case 'BONUS':        totalBonus       += amt; break;
        case 'DEDUCTION':    totalDeduction   += Math.abs(amt); break;
        case 'ADJUSTMENT':   totalAdjustment  += amt; break;
      }
    }

    // If HYBRID or commission-based, also add commission from appointments if no COMMISSION entries
    if ((salaryType === 'HYBRID' || commissionRate > 0) && totalCommission === 0 && spAppts.length > 0) {
      const salesVolume = spAppts.reduce((sum, a) => sum + a.totalPrice, 0);
      const commissionAmount = r2(salesVolume * commissionRate);
      const commEntry = await prisma.payrollEntry.create({
        data: {
          specialistId: sp.id,
          type: 'COMMISSION',
          amount: commissionAmount,
          rate: commissionRate,
          periodMonth: periodMonthStr,
          description: `Commission ${Math.round(commissionRate * 100)}% on ${r2(salesVolume)}`,
          createdBy: userId,
        },
      });
      totalCommission = r2(commEntry.amount as unknown as number);
    }

    const totalPayable = r2(computedBase + totalCommission + totalBonus - totalDeduction + totalAdjustment);

    // Upsert PayrollPeriod
    const periodRecord = await prisma.payrollPeriod.upsert({
      where: {
        specialistId_periodStart_periodEnd: {
          specialistId: sp.id,
          periodStart: dateFrom,
          periodEnd: dateTo,
        },
      },
      update: {
        baseSalary: computedBase,
        totalCommission: r2(totalCommission),
        totalBonus: r2(totalBonus),
        totalDeduction: r2(totalDeduction),
        totalAdjustment: r2(totalAdjustment),
        totalPayable,
      },
      create: {
        specialistId: sp.id,
        periodStart: dateFrom,
        periodEnd: dateTo,
        baseSalary: computedBase,
        totalCommission: r2(totalCommission),
        totalBonus: r2(totalBonus),
        totalDeduction: r2(totalDeduction),
        totalAdjustment: r2(totalAdjustment),
        totalPayable,
        status: 'PENDING',
      },
    });

    results.push({
      specialistId: sp.id,
      baseSalary: computedBase,
      totalCommission: r2(totalCommission),
      totalBonus: r2(totalBonus),
      totalDeduction: r2(totalDeduction),
      totalAdjustment: r2(totalAdjustment),
      totalPayable,
      status: periodRecord.status,
      periodId: periodRecord.id,
    });
  }

  return R.success({ from, to, calculated: results.length, periods: results });
}
