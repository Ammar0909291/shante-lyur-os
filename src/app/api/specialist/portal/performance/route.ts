export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({
    where: { userId },
    select: { id: true, showEarningsToSpecialist: true, commissionRate: true },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  // Optional month/year from query params — default to current month
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10); // 1-based

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 1);

  // All appointments this month for this specialist
  const monthApts = await prisma.appointment.findMany({
    where: { specialistId: specialist.id, startAt: { gte: monthStart, lt: monthEnd } },
    select: {
      status: true,
      totalPrice: true,
      clientId: true,
      startAt: true,
      payments: {
        where: { status: { in: ['CAPTURED', 'AUTHORIZED', 'PARTIALLY_REFUNDED'] } },
        select: { specialistCommission: true },
      },
    },
  });

  const completedApts = monthApts.filter((a) => a.status === 'COMPLETED');

  // Total sales = sum of completed appointment prices
  const totalSales = completedApts.reduce((sum, a) => sum + Number(a.totalPrice ?? 0), 0);

  // Total commission — use Payment.specialistCommission if available, else totalSales * commissionRate
  const commissionsFromPayments = completedApts.flatMap((a) =>
    a.payments.map((p) => Number(p.specialistCommission ?? 0)),
  );
  const totalCommission = commissionsFromPayments.some((v) => v > 0)
    ? commissionsFromPayments.reduce((s, v) => s + v, 0)
    : Math.round(totalSales * Number(specialist.commissionRate));

  // Procedures done = completed appointments count
  const proceduresDone = completedApts.length;

  // Working days = distinct calendar days with at least one non-cancelled appointment
  const activeDays = new Set(
    monthApts
      .filter((a) => a.status !== 'CANCELLED')
      .map((a) => {
        const d = new Date(a.startAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
  );
  const workingDays = activeDays.size;

  // First-time clients: clients who had NO prior appointment with this specialist before monthStart
  const monthClientIds = [...new Set(monthApts.map((a) => a.clientId))];
  let firstTimePurchased  = 0;
  let firstTimeNoPurchase = 0;

  if (monthClientIds.length > 0) {
    const priorApts = await prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        clientId: { in: monthClientIds },
        startAt: { lt: monthStart },
      },
      select: { clientId: true },
    });
    const clientsWithPrior = new Set(priorApts.map((a) => a.clientId));
    const firstTimeIds = new Set(monthClientIds.filter((id) => !clientsWithPrior.has(id)));

    for (const a of monthApts) {
      if (!firstTimeIds.has(a.clientId)) continue;
      if (a.status === 'COMPLETED') firstTimePurchased++;
      else if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') firstTimeNoPurchase++;
    }
  }

  return ok({
    month: {
      proceduresDone,
      totalSales:     Math.round(totalSales),
      totalCommission: Math.round(totalCommission),
      firstTimePurchased,
      firstTimeNoPurchase,
      workingDays,
    },
    commissionRate: Number(specialist.commissionRate),
    showEarnings: specialist.showEarningsToSpecialist,
    // Echo back the queried period
    period: { year, month },
  });
}
