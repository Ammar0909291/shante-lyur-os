export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from'); // YYYY-MM-DD
  const to   = searchParams.get('to');   // YYYY-MM-DD

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo   = to   ? new Date(to + 'T23:59:59') : new Date();

  // All active specialists with user info
  const specialists = await prisma.specialist.findMany({
    where:   { status: 'ACTIVE' },
    select:  {
      id:            true,
      commissionRate: true,
      user:          { select: { firstName: true, lastName: true } },
    },
    orderBy: { user: { lastName: 'asc' } },
  });

  // Completed appointments in range grouped by specialist
  const appts = await prisma.appointment.findMany({
    where: {
      status:  'COMPLETED',
      startAt: { gte: dateFrom, lte: dateTo },
    },
    select: {
      specialistId: true,
      totalPrice:   true,
      payments: {
        where:  { status: 'CAPTURED' },
        select: { specialistCommission: true, amount: true },
      },
    },
  });

  // Aggregate per specialist
  const map = new Map<string, {
    completedBookings: number;
    grossRevenue:      number;
    commissionEarned:  number;
  }>();

  for (const a of appts) {
    const sid = a.specialistId;
    if (!map.has(sid)) map.set(sid, { completedBookings: 0, grossRevenue: 0, commissionEarned: 0 });
    const entry = map.get(sid)!;
    entry.completedBookings += 1;
    entry.grossRevenue      += Number(a.totalPrice);
    // Use stored specialistCommission if available, otherwise calculate from commissionRate
    const payment = a.payments[0];
    if (payment?.specialistCommission != null) {
      entry.commissionEarned += Number(payment.specialistCommission);
    } else if (payment) {
      const sp = specialists.find((s) => s.id === sid);
      const rate = sp ? Number(sp.commissionRate) : 0.3;
      entry.commissionEarned += Number(payment.amount) * rate;
    }
  }

  const rows = specialists.map((sp) => {
    const agg  = map.get(sp.id) ?? { completedBookings: 0, grossRevenue: 0, commissionEarned: 0 };
    const rate = Number(sp.commissionRate);
    return {
      specialistId:      sp.id,
      name:              `${sp.user.firstName} ${sp.user.lastName}`.trim(),
      commissionRate:    rate,
      completedBookings: agg.completedBookings,
      grossRevenue:      Math.round(agg.grossRevenue * 100) / 100,
      commissionEarned:  Math.round(agg.commissionEarned * 100) / 100,
      studioRevenue:     Math.round((agg.grossRevenue - agg.commissionEarned) * 100) / 100,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      completedBookings: acc.completedBookings + r.completedBookings,
      grossRevenue:      Math.round((acc.grossRevenue + r.grossRevenue) * 100) / 100,
      commissionEarned:  Math.round((acc.commissionEarned + r.commissionEarned) * 100) / 100,
      studioRevenue:     Math.round((acc.studioRevenue + r.studioRevenue) * 100) / 100,
    }),
    { completedBookings: 0, grossRevenue: 0, commissionEarned: 0, studioRevenue: 0 },
  );

  return R.success({ from: dateFrom.toISOString(), to: dateTo.toISOString(), rows, totals });
}
