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

const MASSAGE_DAILY_TARGET = 6;

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req.headers.get('x-user-id'), req.headers.get('x-user-role') ?? '');
  if (authErr) return authErr;

  try {
    const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    const lastWeekSameDayStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    const lastWeekSameDayEnd = new Date(lastWeekSameDayStart.getTime() + 86_400_000);
    const thisWeekStart = getWeekStart(SALON_TIMEZONE, todayStart);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86_400_000);
    const lastWeekEnd = thisWeekStart;
    const last30Start = new Date(todayStart.getTime() - 30 * 86_400_000);
    const prev30Start = new Date(last30Start.getTime() - 30 * 86_400_000);

    // All queries in a single parallel batch
    const [
      todayApts,
      yesterdayCount,
      lastWeekSameDayCount,
      allSpecialists,
      workingTodayRows,
      thisWeekRevenueApts,
      lastWeekRevenueAgg,
      last30RevenueAgg,
      prev30RevenueAgg,
      todayRevenueAgg,
    ] = await Promise.all([
      // Bookings — today
      prisma.appointment.findMany({
        where: { startAt: { gte: todayStart, lt: todayEnd } },
        select: {
          status: true,
          specialist: { select: { specialization: true } },
        },
      }),
      prisma.appointment.count({ where: { startAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.appointment.count({ where: { startAt: { gte: lastWeekSameDayStart, lt: lastWeekSameDayEnd } } }),
      // Specialists
      prisma.specialist.findMany({
        select: { id: true, status: true, specialization: true },
      }),
      prisma.appointment.groupBy({
        by: ['specialistId'],
        where: {
          startAt: { gte: todayStart, lt: todayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
        },
      }),
      // Revenue — this week (with specialist for type breakdown)
      prisma.appointment.findMany({
        where: { startAt: { gte: thisWeekStart, lt: todayEnd }, status: 'COMPLETED' },
        select: { totalPrice: true, specialist: { select: { specialization: true } } },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: lastWeekStart, lt: lastWeekEnd }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: last30Start, lt: todayEnd }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: prev30Start, lt: last30Start }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: todayStart, lt: todayEnd }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
    ]);

    // ── Bookings section ──────────────────────────────────────────────────────
    const bookingTotal = todayApts.length;
    const bookingMassage = todayApts.filter(
      a => deriveSpecialistType(a.specialist?.specialization) === 'MASSAGE',
    ).length;

    const bookings = {
      today: {
        total: bookingTotal,
        completed: todayApts.filter(a => a.status === 'COMPLETED').length,
        upcoming: todayApts.filter(
          a => a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS',
        ).length,
        cancelled: todayApts.filter(
          a => a.status === 'CANCELLED' || a.status === 'NO_SHOW',
        ).length,
        byType: {
          cosmetology: bookingTotal - bookingMassage,
          massage: bookingMassage,
        },
      },
      trend: {
        vsYesterday: pct(bookingTotal, yesterdayCount),
        vsLastWeek: pct(bookingTotal, lastWeekSameDayCount),
      },
    };

    // ── Specialists section ───────────────────────────────────────────────────
    const massageSpecialists = allSpecialists.filter(
      s => deriveSpecialistType(s.specialization) === 'MASSAGE',
    );
    const massageIds = massageSpecialists.map(s => s.id);

    const massageApts = massageIds.length > 0
      ? await prisma.appointment.findMany({
          where: {
            specialistId: { in: massageIds },
            startAt: { gte: todayStart, lt: todayEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
          },
          select: { specialistId: true, totalDuration: true },
        })
      : [];

    const workloadMap = new Map<string, number>();
    for (const apt of massageApts) {
      const prev = workloadMap.get(apt.specialistId) ?? 0;
      workloadMap.set(apt.specialistId, prev + apt.totalDuration / 60);
    }

    let meetingTarget = 0;
    let belowTarget = 0;
    for (const s of massageSpecialists) {
      if ((workloadMap.get(s.id) ?? 0) >= MASSAGE_DAILY_TARGET) {
        meetingTarget++;
      } else {
        belowTarget++;
      }
    }

    const specialists = {
      total: allSpecialists.length,
      active: allSpecialists.filter(s => s.status === 'ACTIVE').length,
      byType: {
        cosmetology: allSpecialists.length - massageSpecialists.length,
        massage: massageSpecialists.length,
      },
      workingToday: workingTodayRows.length,
      massageWorkload: {
        meetingTarget,
        belowTarget,
        // TODO: Requires schema addition (MassageWorkloadOverride table)
        overridden: 0,
      },
    };

    // ── Revenue section ───────────────────────────────────────────────────────
    const weekTotal = thisWeekRevenueApts.reduce((sum, a) => sum + toNumber(a.totalPrice), 0);
    const weekMassage = thisWeekRevenueApts
      .filter(a => deriveSpecialistType(a.specialist?.specialization) === 'MASSAGE')
      .reduce((sum, a) => sum + toNumber(a.totalPrice), 0);

    const revenue = {
      thisWeek: {
        total: weekTotal,
        byType: {
          cosmetology: weekTotal - weekMassage,
          massage: weekMassage,
        },
      },
      trend: {
        vsLastWeek: pct(weekTotal, toNumber(lastWeekRevenueAgg._sum.totalPrice)),
        vsLastMonth: pct(
          toNumber(last30RevenueAgg._sum.totalPrice),
          toNumber(prev30RevenueAgg._sum.totalPrice),
        ),
      },
      today: toNumber(todayRevenueAgg._sum.totalPrice),
    };

    return ok({ bookings, specialists, revenue, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[analytics/summary]', e);
    return apiError('INTERNAL_ERROR', 'Failed to fetch dashboard summary', 500);
  }
}
