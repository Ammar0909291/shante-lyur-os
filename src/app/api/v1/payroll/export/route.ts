export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрено',
  PAID: 'Выплачено',
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  FIXED: 'Фиксированная',
  HOURLY: 'Почасовая',
  SHIFT: 'Посменная',
  HYBRID: 'Гибридная',
};

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo = to ? new Date(to + 'T23:59:59') : new Date();
  const fromStr = from ?? dateFrom.toISOString().substring(0, 10);
  const toStr = to ?? dateTo.toISOString().substring(0, 10);
  const periodMonthStr = fromStr.substring(0, 7);

  const specialists = await prisma.specialist.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      department: true,
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

  type ApptAgg = { sessions: number; salesVolume: number; daySet: Set<string> };
  const apptMap = new Map<string, ApptAgg>();
  for (const sp of specialists) {
    apptMap.set(sp.id, { sessions: 0, salesVolume: 0, daySet: new Set() });
  }
  for (const a of appointments) {
    const agg = apptMap.get(a.specialistId);
    if (!agg) continue;
    agg.sessions += 1;
    agg.salesVolume += Number(a.totalPrice);
    agg.daySet.add(a.startAt.toISOString().substring(0, 10));
  }

  type EntryAgg = { commission: number; bonus: number; deduction: number; adjustment: number; baseSalary: number };
  const entryMap = new Map<string, EntryAgg>();
  for (const sp of specialists) {
    entryMap.set(sp.id, { commission: 0, bonus: 0, deduction: 0, adjustment: 0, baseSalary: 0 });
  }
  for (const e of entryRows) {
    const agg = entryMap.get(e.specialistId);
    if (!agg) continue;
    const amt = Number(e.amount);
    switch (e.type) {
      case 'BASE_SALARY': agg.baseSalary   += amt; break;
      case 'COMMISSION':  agg.commission   += amt; break;
      case 'BONUS':       agg.bonus        += amt; break;
      case 'DEDUCTION':   agg.deduction    += Math.abs(amt); break;
      case 'ADJUSTMENT':  agg.adjustment   += amt; break;
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

    const baseSalary      = period ? r2(Number(period.baseSalary))      : r2(entAgg.baseSalary);
    const totalCommission = period ? r2(Number(period.totalCommission))  : r2(entAgg.commission);
    const totalBonus      = period ? r2(Number(period.totalBonus))       : r2(entAgg.bonus);
    const totalDeduction  = period ? r2(Number(period.totalDeduction))   : r2(entAgg.deduction);
    const totalAdjustment = period ? r2(Number(period.totalAdjustment))  : r2(entAgg.adjustment);
    const totalPayable    = period
      ? r2(Number(period.totalPayable))
      : r2(baseSalary + totalCommission + totalBonus - totalDeduction + totalAdjustment);

    return {
      name: `${sp.user.firstName} ${sp.user.lastName}`.trim(),
      salaryType,
      workingDays,
      completedSessions,
      baseSalary,
      salesVolume,
      totalCommission,
      totalBonus,
      totalDeduction,
      totalAdjustment,
      totalPayable,
      status: period ? period.status : 'PENDING',
    };
  });

  // Build CSV with BOM + semicolon-separated
  const BOM = '﻿';
  const headers = [
    'Сотрудник',
    'Тип зарплаты',
    'Рабочих дней',
    'Сессий',
    'База',
    'Продажи',
    'Комиссия',
    'Бонусы',
    'Удержания',
    'Корректировки',
    'К выплате',
    'Статус',
  ];

  const escape = (val: string | number): string => {
    const s = String(val);
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [headers.map(escape).join(';')];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        SALARY_TYPE_LABELS[row.salaryType] ?? row.salaryType,
        row.workingDays,
        row.completedSessions,
        row.baseSalary,
        row.salesVolume,
        row.totalCommission,
        row.totalBonus,
        row.totalDeduction,
        row.totalAdjustment,
        row.totalPayable,
        STATUS_LABELS[row.status] ?? row.status,
      ]
        .map(escape)
        .join(';'),
    );
  }

  const csvContent = BOM + lines.join('\r\n');
  const filename = `payroll_${fromStr}_${toStr}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
