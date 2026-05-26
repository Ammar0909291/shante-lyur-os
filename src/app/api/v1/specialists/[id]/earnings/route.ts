export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) return err('from and to are required');

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    select: {
      id: true,
      totalCommissionPending:  true,
      totalCommissionApproved: true,
      totalCommissionPaid:     true,
    },
  });
  if (!specialist) return err('Specialist not found', 404);

  const fromDate = new Date(from);
  const toDate   = new Date(to + 'T23:59:59.999Z');

  const [entries, period] = await Promise.all([
    prisma.payrollEntry.findMany({
      where: { specialistId: id, createdAt: { gte: fromDate, lte: toDate } },
      select: { type: true, amount: true, entryStatus: true },
    }),
    prisma.payrollPeriod.findFirst({
      where: {
        specialistId: id,
        periodStart:  { gte: fromDate },
        periodEnd:    { lte: toDate },
      },
      select: { status: true, totalPayable: true, totalCommission: true, totalBonus: true },
    }),
  ]);

  const commissions = entries.filter((e) => e.type === 'COMMISSION');
  const bonuses     = entries.filter((e) => e.type === 'BONUS');
  const deductions  = entries.filter((e) => e.type === 'DEDUCTION');

  return ok({
    totalPending:  Number(specialist.totalCommissionPending),
    totalApproved: Number(specialist.totalCommissionApproved),
    totalPaid:     Number(specialist.totalCommissionPaid),
    period: period ? {
      status:          period.status,
      totalPayable:    Number(period.totalPayable),
      totalCommission: Number(period.totalCommission),
      totalBonus:      Number(period.totalBonus),
    } : null,
    byType: {
      commissions: commissions.reduce((s, e) => s + Number(e.amount), 0),
      bonuses:     bonuses.reduce((s, e) => s + Number(e.amount), 0),
      deductions:  deductions.reduce((s, e) => s + Number(e.amount), 0),
    },
  });
}
