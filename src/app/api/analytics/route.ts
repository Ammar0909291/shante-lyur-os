export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидание',
  CONFIRMED: 'Подтверждено',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
  NO_SHOW: 'Не явился',
};

export async function GET(req: NextRequest) {
  try {
    const range = req.nextUrl.searchParams.get('range') ?? '30d';
    const specialistIdFilter = req.nextUrl.searchParams.get('specialistId') ?? undefined;
    const now = new Date();
    let from: Date;
    let groupBy: 'day' | 'month';

    switch (range) {
      case '1d':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case '3m':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        break;
      case '6m':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        break;
      case '1y':
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        groupBy = 'month';
        break;
      default: // '30d'
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
    }

    const baseWhere = {
      startAt: { gte: from, lte: now },
      ...(specialistIdFilter ? { specialistId: specialistIdFilter } : {}),
    };

    const [appointments, statusRows, revenueAgg, avgAgg, topSpecialists] = await Promise.all([
      prisma.appointment.findMany({
        where: baseWhere,
        select: { startAt: true, totalPrice: true, status: true },
        orderBy: { startAt: 'asc' },
      }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.appointment.aggregate({
        where: { ...baseWhere, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { ...baseWhere, status: 'COMPLETED' },
        _avg: { totalPrice: true },
      }),
      prisma.appointment.groupBy({
        by: ['specialistId'],
        where: { ...baseWhere, status: 'COMPLETED' },
        _sum: { totalPrice: true },
        _count: { id: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
    ]);

    // Build time series
    const revenueMap = new Map<string, number>();
    const bookingMap = new Map<string, number>();

    for (const a of appointments) {
      const d = new Date(a.startAt);
      const key = groupBy === 'day'
        ? d.toISOString().split('T')[0]
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      bookingMap.set(key, (bookingMap.get(key) ?? 0) + 1);
      if (a.status === 'COMPLETED') {
        revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(a.totalPrice));
      }
    }

    // Generate all date slots in range
    const keys: string[] = [];
    const cursor = new Date(from);
    while (cursor <= now) {
      const key = groupBy === 'day'
        ? cursor.toISOString().split('T')[0]
        : `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      if (!keys.includes(key)) keys.push(key);
      if (groupBy === 'day') cursor.setDate(cursor.getDate() + 1);
      else cursor.setMonth(cursor.getMonth() + 1);
    }

    const series = keys.map((key) => ({
      date: key,
      revenue: Math.round(revenueMap.get(key) ?? 0),
      bookings: bookingMap.get(key) ?? 0,
    }));

    // Resolve specialist names for top performers
    const specialistIds = topSpecialists.map((s) => s.specialistId);
    const specialists = specialistIds.length > 0
      ? await prisma.specialist.findMany({
          where: { id: { in: specialistIds } },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : [];
    const specMap = new Map(specialists.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`]));

    const totalBookings = appointments.length;
    const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
    const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;

    return ok({
      series,
      statusBreakdown: statusRows.map((s) => ({
        status: s.status,
        label: STATUS_LABELS[s.status] ?? s.status,
        count: s._count.id,
      })),
      topSpecialists: topSpecialists.map((s) => ({
        specialistId: s.specialistId,
        name: specMap.get(s.specialistId) ?? 'Unknown',
        revenue: Math.round(Number(s._sum.totalPrice ?? 0)),
        count: s._count.id,
      })),
      summary: {
        totalRevenue: Math.round(Number(revenueAgg._sum.totalPrice ?? 0)),
        totalBookings,
        completedCount,
        completionRate,
        avgTicket: Math.round(Number(avgAgg._avg.totalPrice ?? 0)),
      },
      range,
      groupBy,
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
