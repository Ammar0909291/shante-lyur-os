export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(msg: string, status = 500) {
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status });
}

const REVENUE_STATUSES = ['CONFIRMED', 'COMPLETED'] as const;

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const fromParam = params.get('from');
    const toParam   = params.get('to');

    // Parse dates. Accept both ISO timestamps and date-only strings.
    // Date-only strings (e.g. "2026-05-20") parse as midnight UTC, which is correct for `from`.
    // For `to` a date-only string would cut off all bookings made after midnight UTC on that day,
    // so we extend it to end-of-that-day (23:59:59.999 UTC).
    const fromDate = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let toDate   = toParam   ? new Date(toParam)   : new Date();

    if (toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      // Date-only string — extend to end of that UTC day
      toDate = new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    }

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return apiError('Invalid date parameters', 400);
    }

    const periodMs  = toDate.getTime() - fromDate.getTime();
    const prevFrom  = new Date(fromDate.getTime() - periodMs);
    const prevTo    = fromDate;

    const statusFilter   = { status: { in: [...REVENUE_STATUSES] } };
    const dateFilter     = { startAt: { gte: fromDate, lte: toDate } };
    const prevDateFilter = { startAt: { gte: prevFrom,  lte: prevTo  } };

    const [
      salesByStaff,
      totals,
      prevTotals,
      cancelledCount,
      specialistPerf,
      procedureRows,
      clientsRaw,
    ] = await Promise.all([
      // Leaderboard — sales attributed to a specific user via soldByUserId
      prisma.appointment.groupBy({
        by: ['soldByUserId'],
        where: { soldByUserId: { not: null }, ...statusFilter, ...dateFilter },
        _count: { _all: true },
        _sum:   { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
      }),

      // Current-period revenue and booking count
      prisma.appointment.aggregate({
        where: { ...statusFilter, ...dateFilter },
        _count: { _all: true },
        _sum:   { totalPrice: true },
      }),

      // Previous-period for delta comparison
      prisma.appointment.aggregate({
        where: { ...statusFilter, ...prevDateFilter },
        _count: { _all: true },
        _sum:   { totalPrice: true },
      }),

      // Cancelled/no-show count (excluded from revenue but shown as context)
      prisma.appointment.count({
        where: { status: { in: ['CANCELLED', 'NO_SHOW'] }, ...dateFilter },
      }),

      // Specialist performance (who performed the work, not who recorded the sale)
      prisma.appointment.groupBy({
        by: ['specialistId'],
        where: { ...statusFilter, ...dateFilter },
        _count: { _all: true },
        _sum:   { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
      }),

      // Procedure/service breakdown
      prisma.appointmentService.groupBy({
        by: ['serviceId'],
        where: { appointment: { ...statusFilter, ...dateFilter } },
        _sum:   { price: true },
        _count: { id: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 10,
      }),

      // Unique clients this period
      prisma.appointment.findMany({
        where: { ...statusFilter, ...dateFilter },
        select:   { clientId: true },
        distinct: ['clientId'],
      }),
    ]);

    // Daily time-series via raw SQL (Prisma groupBy can't truncate by day)
    const dailySales = await prisma.$queryRaw<{ day: Date; revenue: number; count: bigint }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC('day', start_at)    AS day,
          SUM(total_price)::float        AS revenue,
          COUNT(*)::bigint               AS count
        FROM appointments
        WHERE status IN ('CONFIRMED', 'COMPLETED')
          AND start_at >= ${fromDate}
          AND start_at <= ${toDate}
        GROUP BY DATE_TRUNC('day', start_at)
        ORDER BY day ASC
      `
    );

    // ── Resolve user/specialist/service names ───────────────────────────────

    const sellerIds = salesByStaff.map((s) => s.soldByUserId!);
    const [sellers, specialistRecords, serviceRecords] = await Promise.all([
      sellerIds.length > 0
        ? prisma.user.findMany({
            where:  { id: { in: sellerIds } },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : [],
      specialistPerf.length > 0
        ? prisma.specialist.findMany({
            where:   { id: { in: specialistPerf.map((s) => s.specialistId) } },
            include: { user: { select: { firstName: true, lastName: true } } },
          })
        : [],
      procedureRows.length > 0
        ? prisma.service.findMany({
            where:  { id: { in: procedureRows.map((p) => p.serviceId) } },
            select: { id: true, name: true, category: true },
          })
        : [],
    ]);

    const sellerMap    = new Map(sellers.map((s) => [s.id, s]));
    const specMap      = new Map(specialistRecords.map((s) => [s.id, s]));
    const serviceMap   = new Map(serviceRecords.map((s) => [s.id, s]));

    // ── Client metrics: new vs returning ───────────────────────────────────
    const clientIds = clientsRaw.map((c) => c.clientId);
    let newClientsCount = 0;
    if (clientIds.length > 0) {
      const firstAppts = await prisma.appointment.groupBy({
        by:    ['clientId'],
        where: { clientId: { in: clientIds } },
        _min:  { startAt: true },
      });
      newClientsCount = firstAppts.filter(
        (fa) => fa._min.startAt && fa._min.startAt >= fromDate,
      ).length;
    }

    // ── Assemble response ──────────────────────────────────────────────────
    const currentRevenue = Number(totals._sum?.totalPrice ?? 0);
    const currentCount   = totals._count?._all ?? 0;
    const prevRevenue    = Number(prevTotals._sum?.totalPrice ?? 0);
    const prevCount      = prevTotals._count?._all ?? 0;

    const leaderboard = salesByStaff.map((row) => {
      const seller  = sellerMap.get(row.soldByUserId!);
      const revenue = Number(row._sum?.totalPrice ?? 0);
      const count   = row._count?._all ?? 0;
      return {
        userId:  row.soldByUserId!,
        name:    seller ? `${seller.firstName} ${seller.lastName}` : 'Неизвестно',
        role:    seller?.role ?? 'UNKNOWN',
        revenue,
        count,
        avg:     count > 0 ? Math.round(revenue / count) : 0,
      };
    });

    return ok({
      leaderboard,
      totals: {
        revenue:        currentRevenue,
        count:          currentCount,
        cancelledCount,
        completionRate: (currentCount + cancelledCount) > 0
          ? Math.round((currentCount / (currentCount + cancelledCount)) * 100)
          : 100,
        avgCheck: currentCount > 0 ? Math.round(currentRevenue / currentCount) : 0,
      },
      previousPeriod: {
        revenue:      prevRevenue,
        count:        prevCount,
        revenueDelta: prevRevenue > 0
          ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
          : null,
        countDelta: prevCount > 0
          ? Math.round(((currentCount - prevCount) / prevCount) * 100)
          : null,
      },
      daily: dailySales.map((d) => ({
        day:     d.day.toISOString().split('T')[0],
        revenue: Number(d.revenue),
        count:   Number(d.count),
        label:   new Date(d.day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      })),
      procedures: procedureRows.map((p) => {
        const svc = serviceMap.get(p.serviceId);
        return {
          serviceId: p.serviceId,
          name:      svc?.name     ?? 'Unknown',
          category:  svc?.category ?? '',
          revenue:   Number(p._sum?.price ?? 0),
          count:     p._count?.id  ?? 0,
        };
      }),
      specialists: specialistPerf.map((s) => {
        const sp      = specMap.get(s.specialistId);
        const revenue = Number(s._sum?.totalPrice ?? 0);
        const count   = s._count?._all ?? 0;
        return {
          specialistId: s.specialistId,
          name:    sp ? `${sp.user.firstName} ${sp.user.lastName}` : 'Unknown',
          revenue,
          count,
          avg: count > 0 ? Math.round(revenue / count) : 0,
        };
      }),
      clientMetrics: {
        totalUnique:      clientIds.length,
        newClients:       newClientsCount,
        returningClients: clientIds.length - newClientsCount,
      },
      from: fromDate.toISOString(),
      to:   toDate.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) return apiError(error.message);
    return apiError('Unexpected error');
  }
}
