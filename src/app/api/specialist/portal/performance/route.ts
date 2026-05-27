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
    select: { id: true, showEarningsToSpecialist: true },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // All appointments this month
  const monthApts = await prisma.appointment.findMany({
    where: { specialistId: specialist.id, startAt: { gte: monthStart, lt: monthEnd } },
    select: { status: true, totalPrice: true, clientId: true, startAt: true },
  });

  // Procedures done = completed appointments
  const proceduresDone = monthApts.filter((a) => a.status === 'COMPLETED').length;

  // Total sales = sum of completed appointment prices
  const totalSales = monthApts
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + Number(a.totalPrice ?? 0), 0);

  // Working days = distinct calendar days with at least one appointment (any non-cancelled)
  const activeDays = new Set(
    monthApts
      .filter((a) => a.status !== 'CANCELLED')
      .map((a) => {
        const d = new Date(a.startAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
  );
  const workingDays = activeDays.size;

  // First-time clients: clients who had an appointment this month but NEVER with this specialist before
  const monthClientIds = [...new Set(monthApts.map((a) => a.clientId))];

  // For each client, check if they had any appointment with this specialist before monthStart
  const priorAppts = await prisma.appointment.findMany({
    where: {
      specialistId: specialist.id,
      clientId: { in: monthClientIds },
      startAt: { lt: monthStart },
    },
    select: { clientId: true },
  });
  const clientsWithPrior = new Set(priorAppts.map((a) => a.clientId));
  const firstTimeClientIds = new Set(monthClientIds.filter((id) => !clientsWithPrior.has(id)));

  // Among first-time clients, count those with COMPLETED vs not
  let firstTimePurchased  = 0;
  let firstTimeNoPurchase = 0;

  for (const a of monthApts) {
    if (!firstTimeClientIds.has(a.clientId)) continue;
    if (a.status === 'COMPLETED') {
      firstTimePurchased++;
    } else if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') {
      firstTimeNoPurchase++;
    }
  }

  return ok({
    month: {
      proceduresDone,
      totalSales: Math.round(totalSales),
      firstTimePurchased,
      firstTimeNoPurchase,
      workingDays,
    },
    showEarnings: specialist.showEarningsToSpecialist,
  });
}
