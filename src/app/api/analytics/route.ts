export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

    const completedWhere = { ...baseWhere, status: 'COMPLETED' as const };

    // Previous period for comparison
    const periodMs = now.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevBaseWhere = {
      startAt: { gte: prevFrom, lte: from },
      ...(specialistIdFilter ? { specialistId: specialistIdFilter } : {}),
    };

    const [
      appointments,
      statusRows,
      revenueAgg,
      avgAgg,
      topSpecialistsRaw,
      prevRevenueAgg,
      prevBookingCount,
      serviceMetricsRaw,
      specialistPerfRaw,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: baseWhere,
        select: { startAt: true, totalPrice: true, status: true, clientId: true },
        orderBy: { startAt: 'asc' },
      }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.appointment.aggregate({
        where: completedWhere,
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: completedWhere,
        _avg: { totalPrice: true },
      }),
      prisma.appointment.groupBy({
        by: ['specialistId'],
        where: completedWhere,
        _sum: { totalPrice: true },
        _count: { id: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
      prisma.appointment.aggregate({
        where: { ...prevBaseWhere, status: 'COMPLETED' as const },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.count({ where: prevBaseWhere }),
      // Top services by revenue
      prisma.appointmentService.groupBy({
        by: ['serviceId'],
        where: { appointment: baseWhere },
        _sum: { price: true },
        _count: { id: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 10,
      }),
      // Specialist performance with duration
      prisma.appointment.groupBy({
        by: ['specialistId'],
        where: completedWhere,
        _sum: { totalPrice: true, totalDuration: true },
        _count: { id: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10,
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

    // Resolve specialist names
    const allSpecialistIds = [
      ...new Set([
        ...topSpecialistsRaw.map((s) => s.specialistId),
        ...specialistPerfRaw.map((s) => s.specialistId),
      ]),
    ];
    const specialists = allSpecialistIds.length > 0
      ? await prisma.specialist.findMany({
          where: { id: { in: allSpecialistIds } },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : [];
    const specMap = new Map(specialists.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`]));

    // Resolve service names
    const serviceIds = serviceMetricsRaw.map((s) => s.serviceId);
    const services = serviceIds.length > 0
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true, category: true },
        })
      : [];
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    // Client metrics
    const uniqueClientIds = [...new Set(appointments.map((a) => a.clientId))];
    let newClientsCount = 0;
    let returningClientsCount = 0;

    if (uniqueClientIds.length > 0) {
      // First appointment ever for each client in period
      const firstAppointments = await prisma.appointment.groupBy({
        by: ['clientId'],
        where: { clientId: { in: uniqueClientIds } },
        _min: { startAt: true },
      });

      for (const fa of firstAppointments) {
        if (fa._min.startAt && fa._min.startAt >= from) {
          newClientsCount++;
        } else {
          returningClientsCount++;
        }
      }
    }

    const totalClientsInPeriod = uniqueClientIds.length;
    const retentionRate = totalClientsInPeriod > 0
      ? Math.round((returningClientsCount / totalClientsInPeriod) * 100)
      : 0;

    // Heatmap: bookings by day-of-week × hour
    const specialistSql = specialistIdFilter
      ? Prisma.sql`AND specialist_id = ${specialistIdFilter}::uuid`
      : Prisma.empty;

    type HeatmapRow = { dow: number; hour: number; count: bigint };
    const heatmapRaw = await prisma.$queryRaw<HeatmapRow[]>(
      Prisma.sql`
        SELECT
          EXTRACT(DOW FROM start_at)::int AS dow,
          EXTRACT(HOUR FROM start_at)::int AS hour,
          COUNT(*) AS count
        FROM appointments
        WHERE start_at >= ${from} AND start_at <= ${now}
        ${specialistSql}
        GROUP BY dow, hour
      `
    );

    const heatmap = heatmapRaw.map((r) => ({
      dow: r.dow,
      hour: r.hour,
      count: Number(r.count),
    }));

    const totalBookings = appointments.length;
    const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
    const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;

    const prevRevenue = Math.round(Number(prevRevenueAgg._sum.totalPrice ?? 0));
    const currentRevenue = Math.round(Number(revenueAgg._sum.totalPrice ?? 0));

    return ok({
      series,
      statusBreakdown: statusRows.map((s) => ({
        status: s.status,
        label: STATUS_LABELS[s.status] ?? s.status,
        count: s._count.id,
      })),
      topSpecialists: topSpecialistsRaw.map((s) => ({
        specialistId: s.specialistId,
        name: specMap.get(s.specialistId) ?? 'Unknown',
        revenue: Math.round(Number(s._sum.totalPrice ?? 0)),
        count: s._count.id,
      })),
      specialistPerformance: specialistPerfRaw.map((s) => ({
        specialistId: s.specialistId,
        name: specMap.get(s.specialistId) ?? 'Unknown',
        revenue: Math.round(Number(s._sum.totalPrice ?? 0)),
        count: s._count.id,
        bookedHours: Math.round(((s._sum.totalDuration ?? 0) / 60) * 10) / 10,
      })),
      serviceMetrics: serviceMetricsRaw.map((s) => ({
        serviceId: s.serviceId,
        name: serviceMap.get(s.serviceId)?.name ?? 'Unknown',
        category: serviceMap.get(s.serviceId)?.category ?? '',
        revenue: Math.round(Number(s._sum.price ?? 0)),
        count: s._count.id,
      })),
      clientMetrics: {
        totalInPeriod: totalClientsInPeriod,
        newClients: newClientsCount,
        returningClients: returningClientsCount,
        retentionRate,
      },
      heatmap,
      previousPeriod: {
        totalRevenue: prevRevenue,
        totalBookings: prevBookingCount,
        revenueDelta: prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : null,
        bookingsDelta: prevBookingCount > 0 ? Math.round(((totalBookings - prevBookingCount) / prevBookingCount) * 100) : null,
      },
      summary: {
        totalRevenue: currentRevenue,
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
