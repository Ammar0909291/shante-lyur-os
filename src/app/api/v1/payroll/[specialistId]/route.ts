export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { specialistId: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const { specialistId } = params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo = to ? new Date(to + 'T23:59:59') : new Date();
  const periodMonthStr = from
    ? from.substring(0, 7)
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: {
      id: true,
      department: true,
      commissionRate: true,
      user: { select: { firstName: true, lastName: true } },
      salaryConfig: true,
    },
  });

  if (!specialist) return R.notFound('Specialist not found');

  const [entries, payrollPeriod] = await Promise.all([
    prisma.payrollEntry.findMany({
      where: {
        specialistId,
        periodMonth: periodMonthStr,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        rate: true,
        periodMonth: true,
        description: true,
        isLocked: true,
        createdBy: true,
        createdAt: true,
        appointmentId: true,
        paymentId: true,
        appointment: {
          select: {
            startAt: true,
            services: {
              select: {
                service: { select: { name: true } },
                sortOrder: true,
              },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payrollPeriod.findFirst({
      where: {
        specialistId,
        periodStart: { gte: dateFrom },
        periodEnd: { lte: dateTo },
      },
    }),
  ]);

  // Group entries by type with subtotals
  type EntryRow = {
    id: string;
    type: string;
    amount: number;
    rate: number | null;
    periodMonth: string;
    description: string | null;
    isLocked: boolean;
    createdBy: string | null;
    createdAt: Date;
    appointmentId: string | null;
    paymentId: string | null;
    appointmentStartAt: Date | null;
    serviceName: string | null;
  };

  const grouped: Record<string, { entries: EntryRow[]; subtotal: number }> = {
    BASE_SALARY: { entries: [], subtotal: 0 },
    COMMISSION: { entries: [], subtotal: 0 },
    BONUS: { entries: [], subtotal: 0 },
    DEDUCTION: { entries: [], subtotal: 0 },
    ADJUSTMENT: { entries: [], subtotal: 0 },
  };

  for (const e of entries) {
    const amt = Number(e.amount);
    const serviceName =
      e.appointment?.services?.[0]?.service?.name ?? null;

    const row: EntryRow = {
      id: e.id,
      type: e.type,
      amount: r2(amt),
      rate: e.rate !== null ? Number(e.rate) : null,
      periodMonth: e.periodMonth,
      description: e.description ?? null,
      isLocked: e.isLocked,
      createdBy: e.createdBy ?? null,
      createdAt: e.createdAt,
      appointmentId: e.appointmentId ?? null,
      paymentId: e.paymentId ?? null,
      appointmentStartAt: e.appointment?.startAt ?? null,
      serviceName: serviceName,
    };

    const group = grouped[e.type];
    if (group) {
      group.entries.push(row);
      group.subtotal = r2(
        group.subtotal + (e.type === 'DEDUCTION' ? Math.abs(amt) : amt),
      );
    }
  }

  const totals = {
    baseSalary: grouped['BASE_SALARY'].subtotal,
    totalCommission: grouped['COMMISSION'].subtotal,
    totalBonus: grouped['BONUS'].subtotal,
    totalDeduction: grouped['DEDUCTION'].subtotal,
    totalAdjustment: grouped['ADJUSTMENT'].subtotal,
    totalPayable: payrollPeriod
      ? r2(Number(payrollPeriod.totalPayable))
      : r2(
          grouped['BASE_SALARY'].subtotal +
            grouped['COMMISSION'].subtotal +
            grouped['BONUS'].subtotal -
            grouped['DEDUCTION'].subtotal +
            grouped['ADJUSTMENT'].subtotal,
        ),
    status: payrollPeriod?.status ?? 'PENDING',
    periodId: payrollPeriod?.id ?? null,
  };

  return R.success({
    specialist: {
      id: specialist.id,
      name: `${specialist.user.firstName} ${specialist.user.lastName}`.trim(),
      department: specialist.department,
      commissionRate: Number(specialist.commissionRate),
    },
    salaryConfig: specialist.salaryConfig
      ? {
          id: specialist.salaryConfig.id,
          salaryType: specialist.salaryConfig.salaryType,
          fixedAmount: r2(Number(specialist.salaryConfig.fixedAmount)),
          hourlyRate: r2(Number(specialist.salaryConfig.hourlyRate)),
          shiftRate: r2(Number(specialist.salaryConfig.shiftRate)),
          commissionRate: Number(specialist.salaryConfig.commissionRate),
          bonusThresholdSessions: specialist.salaryConfig.bonusThresholdSessions,
          effectiveFrom: specialist.salaryConfig.effectiveFrom,
          notes: specialist.salaryConfig.notes ?? null,
        }
      : null,
    periodMonth: periodMonthStr,
    from: dateFrom.toISOString(),
    to: dateTo.toISOString(),
    grouped,
    totals,
  });
}
