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

  const specialists = await prisma.specialist.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      appointments: {
        where: { startAt: { gte: fromDate, lte: toDate } },
        select: {
          id:            true,
          status:        true,
          totalDuration: true,
          payments: {
            where:  { status: 'CAPTURED' },
            select: { amount: true, specialistCommission: true },
          },
        },
      },
    },
    orderBy: { user: { firstName: 'asc' } },
  });

  const rows = specialists.map((s) => {
    const appts     = s.appointments;
    const completed = appts.filter((a) => a.status === 'COMPLETED');
    const cancelled = appts.filter((a) => a.status === 'CANCELLED');
    const noShows   = appts.filter((a) => a.status === 'NO_SHOW');

    const revenue = completed.reduce((sum, a) =>
      sum + a.payments.reduce((ps, p) => ps + p.amount.toNumber(), 0), 0);
    const commission = completed.reduce((sum, a) =>
      sum + a.payments.reduce((ps, p) => ps + (p.specialistCommission?.toNumber() ?? 0), 0), 0);
    const avgDuration = completed.length
      ? Math.round(completed.reduce((sum, a) => sum + a.totalDuration, 0) / completed.length)
      : 0;

    return {
      specialistId:   s.id,
      name:           `${s.user.firstName} ${s.user.lastName}`.trim(),
      avatarUrl:      s.user.avatarUrl ?? null,
      totalBookings:  appts.length,
      completed:      completed.length,
      cancelled:      cancelled.length,
      noShows:        noShows.length,
      revenue,
      avgTicket:      completed.length ? Math.round(revenue / completed.length) : 0,
      commission,
      avgDuration,
      utilizationRate: appts.length
        ? Math.round((completed.length / appts.length) * 100)
        : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return R.success({ from, to, specialists: rows });
}
