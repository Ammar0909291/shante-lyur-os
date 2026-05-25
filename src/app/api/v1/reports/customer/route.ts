export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const REPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((d) => d.from <= d.to, { message: 'from must be ≤ to' });

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!REPORT_ROLES.includes(role)) return R.forbidden();

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return R.badRequest('Invalid parameters', parsed.error.issues);

  const { from, to } = parsed.data;
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate   = new Date(`${to}T23:59:59`);

  // Clients who had a completed appointment in the period
  const periodClients = await prisma.user.findMany({
    where: {
      clientAppointments: {
        some: {
          status: 'COMPLETED',
          startAt: { gte: fromDate, lte: toDate },
        },
      },
    },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      phone:     true,
      createdAt: true,
      clientAppointments: {
        where:   { status: 'COMPLETED' },
        select:  { startAt: true, payments: { where: { status: 'CAPTURED' }, select: { amount: true } } },
        orderBy: { startAt: 'asc' },
      },
    },
  });

  // Clients who had ANY completed appointment before the period (to detect returning vs new)
  const returningIds = new Set(
    (await prisma.appointment.findMany({
      where: {
        status:  'COMPLETED',
        startAt: { lt: fromDate },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    })).map((a) => a.clientId),
  );

  let newCount       = 0;
  let returningCount = 0;
  let totalRevenue   = 0;

  type ClientRow = {
    clientId:    string;
    name:        string;
    phone:       string | null;
    visits:      number;
    revenue:     number;
    firstVisit:  string;
    lastVisit:   string;
    isNew:       boolean;
  };

  const clientRows: ClientRow[] = periodClients.map((c) => {
    const periodAppts = c.clientAppointments.filter(
      (a) => a.startAt >= fromDate && a.startAt <= toDate,
    );
    const revenue = periodAppts.reduce(
      (sum, a) => sum + a.payments.reduce((ps, p) => ps + p.amount.toNumber(), 0), 0,
    );
    const isNew = !returningIds.has(c.id);
    if (isNew) newCount++; else returningCount++;
    totalRevenue += revenue;

    const allVisits = c.clientAppointments;
    return {
      clientId:   c.id,
      name:       `${c.firstName} ${c.lastName}`.trim(),
      phone:      c.phone ?? null,
      visits:     periodAppts.length,
      revenue,
      firstVisit: allVisits[0]?.startAt.toISOString() ?? fromDate.toISOString(),
      lastVisit:  allVisits[allVisits.length - 1]?.startAt.toISOString() ?? toDate.toISOString(),
      isNew,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalClients = periodClients.length;
  const avgVisits    = totalClients
    ? parseFloat((clientRows.reduce((s, r) => s + r.visits, 0) / totalClients).toFixed(2))
    : 0;
  const avgRevenue   = totalClients ? Math.round(totalRevenue / totalClients) : 0;

  // Churned: visited before period, NOT in period
  const prevPeriodRows = await prisma.appointment.findMany({
    where:   { status: 'COMPLETED', startAt: { lt: fromDate } },
    select:  { clientId: true },
    distinct: ['clientId'],
  });
  const prevIds   = prevPeriodRows.map((r) => r.clientId);
  const activeIds = new Set(periodClients.map((c) => c.id));
  const churnedCount = prevIds.filter((id) => !activeIds.has(id)).length;

  return R.success({
    from, to,
    summary: {
      totalClients,
      newClients:       newCount,
      returningClients: returningCount,
      churnedClients:   churnedCount,
      totalRevenue,
      avgRevenuePerClient: avgRevenue,
      avgVisitsPerClient:  avgVisits,
      retentionRate: totalClients && (newCount + returningCount) > 0
        ? parseFloat(((returningCount / (newCount + returningCount)) * 100).toFixed(1))
        : 0,
    },
    clients: clientRows,
  });
}
