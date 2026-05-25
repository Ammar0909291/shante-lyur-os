/**
 * Sales Analytics — DTOs and Zod schemas
 *
 * Input schemas use Zod for runtime validation.
 * Output types use strict TypeScript interfaces.
 */

import { z } from 'zod';

// ─── Re-usable building blocks ────────────────────────────────────────────────

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const IdsParam = z
  .string()
  .optional()
  .transform((v) =>
    v ? v.split(',').filter(Boolean) : [],
  );

// ─── Query schemas ─────────────────────────────────────────────────────────────

export const SalesQueryParamsSchema = z
  .object({
    from:        DateString,
    to:          DateString,
    employeeIds: IdsParam,
    serviceIds:  IdsParam,
  })
  .refine(
    (d) => new Date(d.from) <= new Date(d.to),
    { message: 'from must be before or equal to to', path: ['from'] },
  )
  .refine(
    (d) => {
      const diff = (new Date(d.to).getTime() - new Date(d.from).getTime()) / 86_400_000;
      return diff <= 365;
    },
    { message: 'Date range may not exceed 365 days', path: ['to'] },
  );

export type SalesQueryParams = z.infer<typeof SalesQueryParamsSchema>;

export const SalesChartQuerySchema = SalesQueryParamsSchema.and(
  z.object({
    groupBy: z.enum(['employee', 'service', 'total']).default('total'),
  }),
);
export type SalesChartQuery = z.infer<typeof SalesChartQuerySchema>;

export const SalesBreakdownQuerySchema = SalesQueryParamsSchema.and(
  z.object({
    view:      z.enum(['employee', 'service']).default('employee'),
    page:      z.coerce.number().int().min(1).default(1),
    limit:     z.coerce.number().int().min(1).max(100).default(20),
    sortBy:    z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
);
export type SalesBreakdownQuery = z.infer<typeof SalesBreakdownQuerySchema>;

export const SalesExportParamsSchema = SalesBreakdownQuerySchema;
export type SalesExportParams = z.infer<typeof SalesExportParamsSchema>;

export const SaleCompleteBodySchema = z.object({
  bookingId:     z.string().uuid(),
  transactionId: z.string().uuid(),
});
export type SaleCompleteBody = z.infer<typeof SaleCompleteBodySchema>;

// ─── KPI delta helper type ────────────────────────────────────────────────────

export interface KpiMetric {
  current:      number;
  previous:     number;
  delta:        number;
  deltaPercent: number | null; // null when previous = 0
}

// ─── GET /api/v1/sales/summary ────────────────────────────────────────────────

export interface SalesSummaryResponse {
  revenue:          KpiMetric;
  bookings:         KpiMetric;
  avgTicket:        KpiMetric;
  uniqueClients:    KpiMetric;
  cancellationRate: KpiMetric; // percentage 0-100
  periodLabel:      string;    // "Today", "This Week", etc.
}

// ─── GET /api/v1/sales/chart ──────────────────────────────────────────────────

export interface SalesChartPoint {
  label:     string; // x-axis label: "Mon", "14:00", "Jan 1", …
  timestamp: string; // ISO bucket start
  revenue:   number;
  bookings:  number;
}

export interface SalesChartSeries {
  key:   string; // employee/service ID or "total"
  name:  string; // display label
  color: string; // hex colour
  data:  SalesChartPoint[];
}

export interface SalesChartResponse {
  series:    SalesChartSeries[];
  bucketBy:  'hour' | 'day' | 'week' | 'month';
  currency:  string;
}

// ─── GET /api/v1/sales/breakdown ─────────────────────────────────────────────

export interface SalesEmployeeRow {
  view:              'employee';
  id:                string;
  name:              string;
  avatarUrl:         string | null;
  bookings:          number;
  revenue:           number;
  avgTicket:         number;
  topService:        string;
  cancellations:     number;
  commissionEarned:  number | null; // null hidden for MANAGER role
}

export interface SalesServiceRow {
  view:          'service';
  id:            string;
  name:          string;
  category:      string;
  bookings:      number;
  revenue:       number;
  avgDuration:   number; // minutes
  topEmployee:   string;
  cancellations: number;
}

export type SalesBreakdownRow = SalesEmployeeRow | SalesServiceRow;

export interface SalesBreakdownResponse {
  items:  SalesBreakdownRow[];
  total:  number;
  page:   number;
  limit:  number;
  totals: {
    bookings:         number;
    revenue:          number;
    cancellations:    number;
    commissionEarned: number | null;
  };
}

// ─── Sale completion event ────────────────────────────────────────────────────

export interface SaleCompletedEventPayload {
  bookingId:       string;
  transactionId:   string;
  clientId:        string;
  clientName:      string;
  specialistId:    string;
  specialistName:  string;
  serviceNames:    string[];
  amount:          number;
  currency:        string;
  paidAt:          string; // ISO
  completedAt:     string; // ISO
}

// ─── Sale notification BullMQ job data ───────────────────────────────────────

export interface SaleNotificationJobData {
  bookingId:      string;
  transactionId:  string;
  clientName:     string;
  specialistName: string;
  serviceNames:   string[];
  amount:         number;
  currency:       string;
  paidAt:         string; // ISO
  triggeredAt:    string; // ISO
}
