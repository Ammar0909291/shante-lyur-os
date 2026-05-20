export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const fromDate = params.get('from') ? new Date(params.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = params.get('to') ? new Date(params.get('to')!) : new Date();

  const dateFilter = { startAt: { gte: fromDate, lte: toDate } };
  const statusFilter = { status: { in: ['CONFIRMED', 'COMPLETED'] as const } };

  const [salesByStaff, totals, dailySales] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['soldByUserId'],
      where: { soldByUserId: { not: null }, ...statusFilter, ...dateFilter },
      _count: { id: true },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
    }),

    prisma.appointment.aggregate({
      where: { ...statusFilter, ...dateFilter },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),

    prisma.$queryRaw<{ day: Date; revenue: number; count: bigint }[]>`
      SELECT
        DATE_TRUNC('day', start_at) AS day,
        SUM(total_price)::float AS revenue,
        COUNT(*)::bigint AS count
      FROM appointments
      WHERE status IN ('CONFIRMED', 'COMPLETED')
        AND start_at >= ${fromDate}
        AND start_at <= ${toDate}
      GROUP BY DATE_TRUNC('day', start_at)
      ORDER BY day ASC
    `,
  ]);

  const sellerIds = salesByStaff.map((s) => s.soldByUserId!);
  const sellers = sellerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: sellerIds } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : [];
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  const leaderboard = salesByStaff.map((row) => {
    const seller = sellerMap.get(row.soldByUserId!);
    const revenue = Number(row._sum.totalPrice ?? 0);
    const count = row._count.id;
    return {
      userId: row.soldByUserId!,
      name: seller ? `${seller.firstName} ${seller.lastName}` : 'Неизвестно',
      role: seller?.role ?? 'UNKNOWN',
      revenue,
      count,
      avg: count > 0 ? Math.round(revenue / count) : 0,
    };
  });

  return ok({
    leaderboard,
    totals: {
      revenue: Number(totals._sum.totalPrice ?? 0),
      count: totals._count.id,
    },
    daily: dailySales.map((d) => ({
      day: d.day,
      revenue: Number(d.revenue),
      count: Number(d.count),
    })),
    from: fromDate,
    to: toDate,
  });
}
