/**
 * SalesService — orchestrates summary, chart, and breakdown queries
 * with Redis caching and delta comparison.
 */

import { createHash } from 'crypto';
import IORedis from 'ioredis';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  fetchKpi,
  fetchChartData,
  fetchEmployeeBreakdown,
  fetchServiceBreakdown,
  markSaleComplete,
  previousPeriod,
  inferBucket,
  type DateRange,
} from '../infrastructure/sales.repository';
import type {
  SalesQueryParams,
  SalesChartQuery,
  SalesBreakdownQuery,
  SalesSummaryResponse,
  SalesChartResponse,
  SalesChartSeries,
  SalesBreakdownResponse,
  KpiMetric,
  SaleCompletedEventPayload,
} from '../domain/sales.dto';

// ─── Redis cache client ───────────────────────────────────────────────────────

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379/0';

let _redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return _redis;
}

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const v = await getRedis().get(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function invalidateSalesCache(): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys('sales:*');
    if (keys.length) await redis.del(...keys);
  } catch {
    // Non-fatal
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterHash(employeeIds: string[], serviceIds: string[]): string {
  const s = [...employeeIds].sort().join(',') + '|' + [...serviceIds].sort().join(',');
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function toRange(from: string, to: string): DateRange {
  const f = new Date(from);
  f.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return { from: f, to: end };
}

function delta(current: number, previous: number): KpiMetric {
  const d = current - previous;
  const pct = previous !== 0 ? Math.round((d / previous) * 100 * 10) / 10 : null;
  return { current, previous, delta: d, deltaPercent: pct };
}

function periodLabel(from: string, to: string): string {
  const now = new Date();
  const f = new Date(from);
  const todayStr = now.toISOString().slice(0, 10);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  if (from === todayStr && to === todayStr) return 'Сегодня';
  if (from === startOfWeek.toISOString().slice(0, 10)) return 'Эта неделя';
  if (f.getDate() === 1 && f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear()) return 'Этот месяц';
  return `${from} — ${to}`;
}

// ─── Series colour palette ────────────────────────────────────────────────────

const PALETTE = [
  '#C9A96E', '#6E9FC9', '#6EC99A', '#C96E6E', '#9A6EC9',
  '#C9B86E', '#6EC9C9', '#C96EA8',
];

// ─── Service methods ──────────────────────────────────────────────────────────

export async function getSalesSummary(
  params: SalesQueryParams,
): Promise<SalesSummaryResponse> {
  const { from, to, employeeIds, serviceIds } = params;
  const cacheKey = `sales:summary:${from}:${to}:${filterHash(employeeIds, serviceIds)}`;

  const cached = await cacheGet<SalesSummaryResponse>(cacheKey);
  if (cached) return cached;

  const range = toRange(from, to);
  const prev  = previousPeriod(range);

  const [cur, prv] = await Promise.all([
    fetchKpi(range, employeeIds, serviceIds),
    fetchKpi(prev,  employeeIds, serviceIds),
  ]);

  const curCancel = cur.totalAll > 0 ? (cur.cancellations / cur.totalAll) * 100 : 0;
  const prvCancel = prv.totalAll > 0 ? (prv.cancellations / prv.totalAll) * 100 : 0;
  const curAvgTicket = cur.bookings > 0 ? cur.revenue / cur.bookings : 0;
  const prvAvgTicket = prv.bookings > 0 ? prv.revenue / prv.bookings : 0;

  const result: SalesSummaryResponse = {
    revenue:          delta(cur.revenue,       prv.revenue),
    bookings:         delta(cur.bookings,      prv.bookings),
    avgTicket:        delta(curAvgTicket,      prvAvgTicket),
    uniqueClients:    delta(cur.uniqueClients, prv.uniqueClients),
    cancellationRate: delta(
      Math.round(curCancel * 10) / 10,
      Math.round(prvCancel * 10) / 10,
    ),
    periodLabel: periodLabel(from, to),
  };

  await cacheSet(cacheKey, result, 120);
  return result;
}

export async function getSalesChart(
  query: SalesChartQuery,
): Promise<SalesChartResponse> {
  const { from, to, employeeIds, serviceIds, groupBy } = query;
  const cacheKey = `sales:chart:${from}:${to}:${groupBy}:${filterHash(employeeIds, serviceIds)}`;

  const cached = await cacheGet<SalesChartResponse>(cacheKey);
  if (cached) return cached;

  const range  = toRange(from, to);
  const bucket = inferBucket(range);
  const rows   = await fetchChartData(range, employeeIds, serviceIds, groupBy, bucket);

  // Build series map
  const seriesMap = new Map<string, SalesChartSeries>();
  let colorIdx = 0;

  for (const row of rows) {
    if (!seriesMap.has(row.entityId)) {
      seriesMap.set(row.entityId, {
        key:   row.entityId,
        name:  row.entityName,
        color: PALETTE[colorIdx++ % PALETTE.length],
        data:  [],
      });
    }

    const label = formatBucketLabel(row.bucket, bucket);
    seriesMap.get(row.entityId)!.data.push({
      label,
      timestamp: row.bucket.toISOString(),
      revenue:   row.revenue,
      bookings:  row.bookings,
    });
  }

  const result: SalesChartResponse = {
    series:   Array.from(seriesMap.values()),
    bucketBy: bucket,
    currency: 'RUB',
  };

  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getSalesBreakdown(
  query: SalesBreakdownQuery,
): Promise<SalesBreakdownResponse> {
  const { from, to, employeeIds, serviceIds, view, page, limit, sortBy, sortOrder } = query;
  const cacheKey = `sales:breakdown:${from}:${to}:${view}:${page}:${limit}:${sortBy ?? ''}:${sortOrder}:${filterHash(employeeIds, serviceIds)}`;

  const cached = await cacheGet<SalesBreakdownResponse>(cacheKey);
  if (cached) return cached;

  const range = toRange(from, to);

  if (view === 'employee') {
    const { rows, total } = await fetchEmployeeBreakdown(
      range, employeeIds, serviceIds, page, limit, sortBy ?? 'revenue', sortOrder,
    );

    const totalRevenue     = rows.reduce((s, r) => s + r.revenue, 0);
    const totalBookings    = rows.reduce((s, r) => s + r.bookings, 0);
    const totalCancels     = rows.reduce((s, r) => s + r.cancellations, 0);
    const totalCommission  = rows.reduce((s, r) => s + r.commissionEarned, 0);

    const result: SalesBreakdownResponse = {
      items: rows.map((r) => ({
        view:             'employee' as const,
        id:               r.specialistId,
        name:             `${r.firstName} ${r.lastName}`,
        avatarUrl:        r.avatarUrl,
        bookings:         r.bookings,
        revenue:          r.revenue,
        avgTicket:        r.bookings > 0 ? Math.round((r.revenue / r.bookings) * 100) / 100 : 0,
        topService:       r.topServiceName,
        cancellations:    r.cancellations,
        commissionEarned: r.commissionEarned,
      })),
      total,
      page,
      limit,
      totals: {
        bookings:         totalBookings,
        revenue:          Math.round(totalRevenue * 100) / 100,
        cancellations:    totalCancels,
        commissionEarned: Math.round(totalCommission * 100) / 100,
      },
    };

    await cacheSet(cacheKey, result, 60);
    return result;
  }

  // view === 'service'
  const { rows, total } = await fetchServiceBreakdown(
    range, employeeIds, serviceIds, page, limit, sortBy ?? 'revenue', sortOrder,
  );

  const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);
  const totalCancels  = rows.reduce((s, r) => s + r.cancellations, 0);

  const result: SalesBreakdownResponse = {
    items: rows.map((r) => ({
      view:          'service' as const,
      id:            r.serviceId,
      name:          r.serviceName,
      category:      r.category,
      bookings:      r.bookings,
      revenue:       r.revenue,
      avgDuration:   r.avgDuration,
      topEmployee:   r.topEmployee,
      cancellations: r.cancellations,
    })),
    total,
    page,
    limit,
    totals: {
      bookings:         totalBookings,
      revenue:          Math.round(totalRevenue * 100) / 100,
      cancellations:    totalCancels,
      commissionEarned: null,
    },
  };

  await cacheSet(cacheKey, result, 60);
  return result;
}

// ─── Sale completion ──────────────────────────────────────────────────────────

export async function completeSale(
  bookingId:     string,
  transactionId: string,
): Promise<SaleCompletedEventPayload | null> {
  const result = await markSaleComplete(bookingId, transactionId);
  if (result.alreadyProcessed) return null;

  void invalidateSalesCache();

  return {
    bookingId,
    transactionId,
    clientId:       result.clientId,
    clientName:     result.clientName,
    specialistId:   result.specialistId,
    specialistName: result.specialistName,
    serviceNames:   result.serviceNames,
    amount:         result.amount,
    currency:       result.currency,
    paidAt:         result.paidAt.toISOString(),
    completedAt:    new Date().toISOString(),
  };
}

export async function completeSaleByProviderPaymentId(
  providerPaymentId: string,
  provider: string,
): Promise<SaleCompletedEventPayload | null> {
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId, provider: provider as never },
    select: { id: true, appointmentId: true },
  });
  if (!payment?.appointmentId) return null;
  return completeSale(payment.appointmentId, payment.id);
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function buildCsvFromBreakdown(data: SalesBreakdownResponse): string {
  if (!data.items.length) return '';

  const first = data.items[0];
  const isEmployee = first.view === 'employee';

  const headers = isEmployee
    ? ['Сотрудник', 'Записей', 'Выручка', 'Средний чек', 'Топ услуга', 'Отмены', 'Комиссия']
    : ['Услуга', 'Категория', 'Записей', 'Выручка', 'Ср. продолж. (мин)', 'Топ сотрудник', 'Отмены'];

  const rows = data.items.map((item) => {
    if (item.view === 'employee') {
      return [
        item.name,
        item.bookings,
        item.revenue.toFixed(2),
        item.avgTicket.toFixed(2),
        item.topService,
        item.cancellations,
        item.commissionEarned?.toFixed(2) ?? '',
      ].map(csvCell).join(',');
    }
    return [
      item.name,
      item.category,
      item.bookings,
      item.revenue.toFixed(2),
      item.avgDuration,
      item.topEmployee,
      item.cancellations,
    ].map(csvCell).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─── Bucket label formatter ───────────────────────────────────────────────────

function formatBucketLabel(date: Date, bucket: 'hour' | 'day' | 'week' | 'month'): string {
  switch (bucket) {
    case 'hour':
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    case 'day':
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    case 'week':
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    case 'month':
      return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
  }
}
