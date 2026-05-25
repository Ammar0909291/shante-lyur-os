export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

const REPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const QuerySchema = z.object({
  from:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.enum(['day', 'week', 'month', 'specialist', 'service']).default('day'),
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

  const { from, to, groupBy } = parsed.data;
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate   = new Date(`${to}T23:59:59`);

  // ── Core payment aggregation ────────────────────────────────────────────
  const payments = await prisma.payment.findMany({
    where: {
      status:  { in: ['CAPTURED'] },
      paidAt:  { gte: fromDate, lte: toDate },
    },
    include: {
      appointment: {
        include: {
          specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
          services:   { include: { service: { select: { name: true, category: true } } }, orderBy: { sortOrder: 'asc' } },
        },
      },
    },
    orderBy: { paidAt: 'asc' },
  });

  const refunds = await prisma.refund.aggregate({
    where:  { status: 'COMPLETED', createdAt: { gte: fromDate, lte: toDate } },
    _sum:   { amount: true },
    _count: true,
  });

  const totalRevenue  = payments.reduce((s, p) => s + p.amount.toNumber(), 0);
  const totalRefunds  = refunds._sum.amount?.toNumber() ?? 0;
  const netRevenue    = totalRevenue - totalRefunds;

  // ── Group breakdown ──────────────────────────────────────────────────────
  type GroupRow = { key: string; label: string; revenue: number; bookings: number };
  const groupMap = new Map<string, GroupRow>();

  for (const p of payments) {
    let key   = '';
    let label = '';

    if (groupBy === 'day') {
      key = label = (p.paidAt ?? p.createdAt).toISOString().slice(0, 10);
    } else if (groupBy === 'week') {
      const d  = p.paidAt ?? p.createdAt;
      const wk = new Date(d);
      wk.setDate(d.getDate() - d.getDay() + 1);
      key = label = wk.toISOString().slice(0, 10);
    } else if (groupBy === 'month') {
      const d = p.paidAt ?? p.createdAt;
      key = label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'specialist') {
      const sp = p.appointment?.specialist;
      key      = p.appointment?.specialistId ?? 'unknown';
      label    = sp ? `${sp.user.firstName} ${sp.user.lastName}`.trim() : 'Неизвестно';
    } else if (groupBy === 'service') {
      const svc = p.appointment?.services[0]?.service;
      key       = p.appointment?.services[0]?.serviceId ?? 'unknown';
      label     = svc?.name ?? 'Неизвестно';
    }

    if (!key) continue;
    const existing = groupMap.get(key);
    if (existing) {
      existing.revenue  += p.amount.toNumber();
      existing.bookings += 1;
    } else {
      groupMap.set(key, { key, label, revenue: p.amount.toNumber(), bookings: 1 });
    }
  }

  const byGroup = Array.from(groupMap.values()).sort((a, b) =>
    groupBy === 'day' || groupBy === 'week' || groupBy === 'month'
      ? a.key.localeCompare(b.key)
      : b.revenue - a.revenue,
  );

  void logAudit({
    userId, role,
    action: 'EXPORT',
    entityType: 'RevenueReport',
    metadata: { event: 'REVENUE_REPORT_GENERATED', from, to, groupBy },
    ...getRequestMeta(req),
  });

  return R.success({
    from, to, groupBy,
    totalRevenue,
    totalRefunds,
    netRevenue,
    transactionCount: payments.length,
    avgTicket:        payments.length ? Math.round(totalRevenue / payments.length) : 0,
    byGroup,
  });
}
