export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);
  if (role === 'RECEPTIONIST') return err('Access denied', 403);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');
  if (!from || !to) return err('from and to are required');

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const fromDate = new Date(from);
  const toDate   = new Date(to + 'T23:59:59.999Z');
  const monthStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

  const [entries, period, completedCount] = await Promise.all([
    prisma.payrollEntry.findMany({
      where: { specialistId: specialist.id, periodMonth: monthStr },
      select: { type: true, amount: true },
    }),
    prisma.payrollPeriod.findFirst({
      where: {
        specialistId: specialist.id,
        periodStart: { gte: new Date(fromDate.getFullYear(), fromDate.getMonth(), 1) },
        periodEnd:   { lte: new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0, 23, 59, 59) },
      },
      select: { totalPayable: true, totalCommission: true, baseSalary: true, totalBonus: true, totalDeduction: true, status: true },
    }),
    prisma.appointment.count({
      where: {
        specialistId: specialist.id,
        startAt: { gte: fromDate, lte: toDate },
        status: 'COMPLETED',
      },
    }),
  ]);

  let totalCommission = 0, totalBonus = 0, baseSalary = 0;
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.type === 'COMMISSION')  totalCommission += amt;
    if (e.type === 'BONUS')       totalBonus      += amt;
    if (e.type === 'BASE_SALARY') baseSalary      += amt;
  }

  return ok({
    baseSalary:         period ? Number(period.baseSalary)         : baseSalary,
    totalCommission:    period ? Number(period.totalCommission)     : totalCommission,
    totalBonus:         period ? Number(period.totalBonus)          : totalBonus,
    totalDeduction:     period ? Number(period.totalDeduction)      : 0,
    totalPayable:       period ? Number(period.totalPayable)        : Math.round((baseSalary + totalCommission + totalBonus) * 100) / 100,
    payrollStatus:      period?.status ?? null,
    completedProcedures: completedCount,
  });
}
