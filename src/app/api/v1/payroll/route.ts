export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const DEPARTMENT_LABELS: Record<string, string> = {
  COSMETOLOGY: 'Косметолог',
  MASSAGE: 'Массажист',
  RECEPTION: 'Администратор',
  MANAGEMENT: 'Менеджер',
};

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo = to ? new Date(to + 'T23:59:59') : new Date();
  const periodMonthStr = from
    ? from.substring(0, 7)
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const specialists = await prisma.specialist.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      department: true,
      specialization: true,
      commissionRate: true,
      user: { select: { firstName: true, lastName: true } },
      salaryConfig: true,
      payrollPeriods: {
        where: {
          periodStart: { gte: dateFrom },
          periodEnd: { lte: dateTo },
        },
        take: 1,
      },
    },
    orderBy: { user: { lastName: 'asc' } },
  });

  const specialistIds = specialists.map((s) => s.id);

  const [appointments, entryRows] = await Promise.all([
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
        startAt: true,
      },
    }),
    prisma.payrollEntry.findMany({
      where: {
        specialistId: { in: specialistIds },
        periodMonth: periodMonthStr,
      },
      select: {
        specialistId: true,
        type: true,
        amount: true,
      },
    }),
  ]);

  // Aggregate appointments per specialist
  type ApptAgg = {
    sessions: number;
    salesVolume: number;
    daySet: Set<string>;
    daySessions: Map<string, number>;
  };
  const apptMap = new Map<string, ApptAgg>();
  for (const sp of specialists) {
    apptMap.set(sp.id, { sessions: 0, salesVolume: 0, daySet: new Set(), daySessions: new Map() });
  }
  for (const a of appointments) {
    const agg = apptMap.get(a.specialistId);
    if (!agg) continue;
    agg.sessions += 1;
    agg.salesVolume += Number(a.totalPrice);
    const dayKey = a.startAt.toISOString().substring(0, 10);
    agg.daySet.add(dayKey);
    agg.daySessions.set(dayKey, (agg.daySessions.get(dayKey) ?? 0) + 1);
  }

  // Aggregate payroll entries per specialist
  type EntryAgg = {
    commission: number;
    bonus: number;
    deduction: number;
    adjustment: number;
    baseSalary: number;
  };
  const entryMap = new Map<string, EntryAgg>();
  for (const sp of specialists) {
    entryMap.set(sp.id, { commission: 0, bonus: 0, deduction: 0, adjustment: 0, baseSalary: 0 });
  }
  for (const e of entryRows) {
    const agg = entryMap.get(e.specialistId);
    if (!agg) continue;
    const amt = Number(e.amount);
    switch (e.type) {
      case 'BASE_SALARY':
        agg.baseSalary += amt;
        break;
      case 'COMMISSION':
        agg.commission += amt;
        break;
      case 'BONUS':
        agg.bonus += amt;
        break;
      case 'DEDUCTION':
        agg.deduction += Math.abs(amt);
        break;
      case 'ADJUSTMENT':
        agg.adjustment += amt;
        break;
    }
  }

  const rows = specialists.map((sp) => {
    const apptAgg = apptMap.get(sp.id)!;
    const entAgg = entryMap.get(sp.id)!;
    const period = sp.payrollPeriods[0] ?? null;
    const cfg = sp.salaryConfig;

    const salaryType = cfg?.salaryType ?? 'FIXED';
    const workingDays = apptAgg.daySet.size;
    const completedSessions = apptAgg.sessions;
    const salesVolume = r2(apptAgg.salesVolume);
    const bonusThresholdSessions = cfg?.bonusThresholdSessions ?? null;

    let maxDailySessions = 0;
    let daysOverThreshold = 0;
    for (const [, cnt] of apptAgg.daySessions) {
      if (cnt > maxDailySessions) maxDailySessions = cnt;
      if (bonusThresholdSessions !== null && cnt >= bonusThresholdSessions) daysOverThreshold += 1;
    }

    const baseSalary = period ? r2(Number(period.baseSalary)) : r2(entAgg.baseSalary);
    const totalCommission = period ? r2(Number(period.totalCommission)) : r2(entAgg.commission);
    const totalBonus = period ? r2(Number(period.totalBonus)) : r2(entAgg.bonus);
    const totalDeduction = period ? r2(Number(period.totalDeduction)) : r2(entAgg.deduction);
    const totalAdjustment = period ? r2(Number(period.totalAdjustment)) : r2(entAgg.adjustment);
    const totalPayable = period
      ? r2(Number(period.totalPayable))
      : r2(baseSalary + totalCommission + totalBonus - totalDeduction + totalAdjustment);

    return {
      specialistId: sp.id,
      name: `${sp.user.firstName} ${sp.user.lastName}`.trim(),
      role: sp.specialization ?? DEPARTMENT_LABELS[sp.department] ?? 'Специалист',
      department: sp.department,
      salaryType,
      workingDays,
      completedSessions,
      baseSalary,
      totalCommission,
      totalBonus,
      totalDeduction,
      totalAdjustment,
      totalPayable,
      status: period ? period.status : 'PENDING',
      bonusThresholdSessions,
      maxDailySessions,
      daysOverThreshold,
      salesVolume,
      periodId: period?.id ?? null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      totalPayrollCost: r2(acc.totalPayrollCost + r.totalPayable),
      totalCommission: r2(acc.totalCommission + r.totalCommission),
      totalBaseSalaries: r2(acc.totalBaseSalaries + r.baseSalary),
      employeesProcessed: acc.employeesProcessed + 1,
      pendingApproval: acc.pendingApproval + (r.status === 'PENDING' ? 1 : 0),
    }),
    { totalPayrollCost: 0, totalCommission: 0, totalBaseSalaries: 0, employeesProcessed: 0, pendingApproval: 0 },
  );

  return R.success({ from: dateFrom.toISOString(), to: dateTo.toISOString(), rows, totals });
}
