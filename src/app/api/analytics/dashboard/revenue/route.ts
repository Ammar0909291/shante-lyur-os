export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  getWeekStart,
  pct,
  checkAuth,
} from '../_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req.headers.get('x-user-id'), req.headers.get('x-user-role') ?? '');
  if (authErr) return authErr;

  try {
    const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
    const thisWeekStart = getWeekStart(SALON_TIMEZONE, todayStart);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86_400_000);
    const lastWeekEnd = thisWeekStart;
    const last30Start = new Date(todayStart.getTime() - 30 * 86_400_000);
    const prev30Start = new Date(last30Start.getTime() - 30 * 86_400_000);

    const [thisWeekApts, lastWeekAgg, last30Agg, prev30Agg, todayAgg] = await Promise.all([
      // This week's completed appointments — need specialist specialization for type breakdown
      prisma.appointment.findMany({
        where: {
          startAt: { gte: thisWeekStart, lt: todayEnd },
          status: 'COMPLETED',
        },
        select: {
          totalPrice: true,
          specialist: { select: { specialization: true } },
        },
      }),
      // Last week total revenue (for vsLastWeek trend)
      prisma.appointment.aggregate({
        where: {
          startAt: { gte: lastWeekStart, lt: lastWeekEnd },
          status: 'COMPLETED',
        },
        _sum: { totalPrice: true },
      }),
      // Last 30 days revenue (for vsLastMonth trend)
      prisma.appointment.aggregate({
        where: {
          startAt: { gte: last30Start, lt: todayEnd },
          status: 'COMPLETED',
        },
        _sum: { totalPrice: true },
      }),
      // Previous 30 days revenue (baseline for vsLastMonth)
      prisma.appointment.aggregate({
        where: {
          startAt: { gte: prev30Start, lt: last30Start },
          status: 'COMPLETED',
        },
        _sum: { totalPrice: true },
      }),
      // Today's revenue
      prisma.appointment.aggregate({
        where: {
          startAt: { gte: todayStart, lt: todayEnd },
          status: 'COMPLETED',
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const thisWeekTotal = thisWeekApts.reduce((sum, a) => sum + toNumber(a.totalPrice), 0);
    const massageRevenue = thisWeekApts
      .filter(a => deriveSpecialistType(a.specialist?.specialization) === 'MASSAGE')
      .reduce((sum, a) => sum + toNumber(a.totalPrice), 0);

    const lastWeekTotal = toNumber(lastWeekAgg._sum.totalPrice);
    const last30Total = toNumber(last30Agg._sum.totalPrice);
    const prev30Total = toNumber(prev30Agg._sum.totalPrice);
    const todayTotal = toNumber(todayAgg._sum.totalPrice);

    return ok({
      thisWeek: {
        total: thisWeekTotal,
        byType: {
          cosmetology: thisWeekTotal - massageRevenue,
          massage: massageRevenue,
        },
      },
      trend: {
        vsLastWeek: pct(thisWeekTotal, lastWeekTotal),
        vsLastMonth: pct(last30Total, prev30Total),
      },
      today: todayTotal,
    });
  } catch (e) {
    console.error('[analytics/revenue]', e);
    return apiError('INTERNAL_ERROR', 'Failed to fetch revenue analytics', 500);
  }
}
