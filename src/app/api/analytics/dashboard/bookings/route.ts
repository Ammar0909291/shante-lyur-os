export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  pct,
  checkAuth,
} from '../_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req.headers.get('x-user-id'), req.headers.get('x-user-role') ?? '');
  if (authErr) return authErr;

  try {
    const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    const lastWeekSameDayStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    const lastWeekSameDayEnd = new Date(lastWeekSameDayStart.getTime() + 86_400_000);

    const [todayApts, yesterdayCount, lastWeekCount] = await Promise.all([
      prisma.appointment.findMany({
        where: { startAt: { gte: todayStart, lt: todayEnd } },
        select: {
          status: true,
          specialist: { select: { specialization: true } },
        },
      }),
      prisma.appointment.count({
        where: { startAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      prisma.appointment.count({
        where: { startAt: { gte: lastWeekSameDayStart, lt: lastWeekSameDayEnd } },
      }),
    ]);

    const total = todayApts.length;
    const completed = todayApts.filter(a => a.status === 'COMPLETED').length;
    const upcoming = todayApts.filter(
      a => a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS',
    ).length;
    const cancelled = todayApts.filter(
      a => a.status === 'CANCELLED' || a.status === 'NO_SHOW',
    ).length;
    const massage = todayApts.filter(
      a => deriveSpecialistType(a.specialist?.specialization) === 'MASSAGE',
    ).length;

    return ok({
      today: {
        total,
        completed,
        upcoming,
        cancelled,
        byType: {
          cosmetology: total - massage,
          massage,
        },
      },
      trend: {
        vsYesterday: pct(total, yesterdayCount),
        vsLastWeek: pct(total, lastWeekCount),
      },
    });
  } catch (e) {
    console.error('[analytics/bookings]', e);
    return apiError('INTERNAL_ERROR', 'Failed to fetch booking analytics', 500);
  }
}
