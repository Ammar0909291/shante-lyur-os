/**
 * SalesRepository — Prisma-direct queries for the Sales Analytics module.
 *
 * Revenue source of truth: Payment.amount WHERE status = CAPTURED + paidAt in range.
 * Booking counts: Appointment WHERE status = COMPLETED + startAt in range.
 * Commission: Payment.specialistCommission per specialist.
 */

import { prisma } from '@/infrastructure/config/prisma-client';
import { Prisma } from '@prisma/client';

// ─── Internal query helpers ───────────────────────────────────────────────────

export interface DateRange {
  from: Date;
  to:   Date;
}

/** Shift a range backward by the same duration (for delta comparison). */
export function previousPeriod(range: DateRange): DateRange {
  const ms = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - ms - 1),
    to:   new Date(range.from.getTime() - 1),
  };
}

// ─── KPI aggregates ───────────────────────────────────────────────────────────

export interface KpiRaw {
  revenue:       number;
  bookings:      number;
  cancellations: number;
  uniqueClients: number;
  totalAll:      number; // all non-CANCELLED bookings (denominator for cancellation rate)
}

export async function fetchKpi(
  range: DateRange,
  employeeIds: string[],
  serviceIds: string[],
): Promise<KpiRaw> {
  // Build appointment where clause
  const apptWhere: Prisma.AppointmentWhereInput = {
    startAt: { gte: range.from, lte: range.to },
  };
  if (employeeIds.length) apptWhere.specialistId = { in: employeeIds };
  if (serviceIds.length) {
    apptWhere.services = { some: { serviceId: { in: serviceIds } } };
  }

  const [completedAgg, cancelledCount, totalCount, uniqueClientAgg, paymentAgg] = await Promise.all([
    // Completed bookings count
    prisma.appointment.count({
      where: { ...apptWhere, status: 'COMPLETED' },
    }),

    // Cancelled bookings count
    prisma.appointment.count({
      where: { ...apptWhere, status: 'CANCELLED' },
    }),

    // Total bookings (all statuses in period)
    prisma.appointment.count({ where: apptWhere }),

    // Unique clients
    prisma.appointment.groupBy({
      by: ['clientId'],
      where: { ...apptWhere, status: 'COMPLETED' },
    }),

    // Revenue from CAPTURED payments
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'CAPTURED',
        paidAt: { gte: range.from, lte: range.to },
        appointment: employeeIds.length
          ? { specialistId: { in: employeeIds } }
          : serviceIds.length
          ? { services: { some: { serviceId: { in: serviceIds } } } }
          : undefined,
      },
    }),
  ]);

  return {
    revenue:       paymentAgg._sum?.amount?.toNumber() ?? 0,
    bookings:      completedAgg,
    cancellations: cancelledCount,
    uniqueClients: uniqueClientAgg.length,
    totalAll:      totalCount,
  };
}

// ─── Chart data ───────────────────────────────────────────────────────────────

export type BucketBy = 'hour' | 'day' | 'week' | 'month';

export function inferBucket(range: DateRange): BucketBy {
  const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  if (days <= 1)   return 'hour';
  if (days <= 31)  return 'day';
  if (days <= 90)  return 'week';
  return 'month';
}

export interface RawChartRow {
  bucket:    Date;
  revenue:   number;
  bookings:  number;
  entityId:  string;
  entityName: string;
}

/**
 * Returns per-bucket revenue+bookings grouped by specialist, service, or "total".
 * Uses raw SQL for efficient time-bucketing.
 */
export async function fetchChartData(
  range:       DateRange,
  employeeIds: string[],
  serviceIds:  string[],
  groupBy:     'employee' | 'service' | 'total',
  bucket:      BucketBy,
): Promise<RawChartRow[]> {
  const pgTrunc = {
    hour:  'hour',
    day:   'day',
    week:  'week',
    month: 'month',
  }[bucket];

  // Build appointment filter conditions for raw SQL
  const specFilter = employeeIds.length
    ? Prisma.sql`AND a.specialist_id = ANY(${Prisma.sql`ARRAY[${Prisma.join(employeeIds.map((id) => Prisma.sql`${id}::uuid`))}]`})`
    : Prisma.empty;
  const svcFilter = serviceIds.length
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM appointment_services aps WHERE aps.appointment_id = a.id AND aps.service_id = ANY(${Prisma.sql`ARRAY[${Prisma.join(serviceIds.map((id) => Prisma.sql`${id}::uuid`))}]`}))`
    : Prisma.empty;

  if (groupBy === 'total') {
    const rows = await prisma.$queryRaw<{ bucket: Date; revenue: number; bookings: bigint }[]>`
      SELECT
        DATE_TRUNC(${pgTrunc}, p.paid_at) AS bucket,
        COALESCE(SUM(p.amount), 0)::float AS revenue,
        COUNT(DISTINCT a.id) AS bookings
      FROM payments p
      JOIN appointments a ON a.id = p.appointment_id
      WHERE p.status = 'CAPTURED'
        AND p.paid_at >= ${range.from}
        AND p.paid_at <= ${range.to}
        AND a.status = 'COMPLETED'
        ${specFilter}
        ${svcFilter}
      GROUP BY bucket
      ORDER BY bucket
    `;
    return rows.map((r) => ({
      bucket:    r.bucket,
      revenue:   Number(r.revenue),
      bookings:  Number(r.bookings),
      entityId:  'total',
      entityName: 'Total',
    }));
  }

  if (groupBy === 'employee') {
    const rows = await prisma.$queryRaw<{ bucket: Date; revenue: number; bookings: bigint; specialist_id: string; first_name: string; last_name: string }[]>`
      SELECT
        DATE_TRUNC(${pgTrunc}, p.paid_at) AS bucket,
        COALESCE(SUM(p.amount), 0)::float AS revenue,
        COUNT(DISTINCT a.id) AS bookings,
        s.id AS specialist_id,
        u.first_name,
        u.last_name
      FROM payments p
      JOIN appointments a ON a.id = p.appointment_id
      JOIN specialists s ON s.id = a.specialist_id
      JOIN users u ON u.id = s.user_id
      WHERE p.status = 'CAPTURED'
        AND p.paid_at >= ${range.from}
        AND p.paid_at <= ${range.to}
        AND a.status = 'COMPLETED'
        ${specFilter}
        ${svcFilter}
      GROUP BY bucket, s.id, u.first_name, u.last_name
      ORDER BY bucket, s.id
    `;
    return rows.map((r) => ({
      bucket:    r.bucket,
      revenue:   Number(r.revenue),
      bookings:  Number(r.bookings),
      entityId:  r.specialist_id,
      entityName: `${r.first_name} ${r.last_name}`,
    }));
  }

  // groupBy === 'service'
  const rows = await prisma.$queryRaw<{ bucket: Date; revenue: number; bookings: bigint; service_id: string; name: string }[]>`
    SELECT
      DATE_TRUNC(${pgTrunc}, p.paid_at) AS bucket,
      COALESCE(SUM(p.amount / NULLIF(svc_count.cnt, 0)), 0)::float AS revenue,
      COUNT(DISTINCT a.id) AS bookings,
      svc.id AS service_id,
      svc.name
    FROM payments p
    JOIN appointments a ON a.id = p.appointment_id
    JOIN appointment_services aps ON aps.appointment_id = a.id
    JOIN services svc ON svc.id = aps.service_id
    JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM appointment_services WHERE appointment_id = a.id
    ) svc_count ON true
    WHERE p.status = 'CAPTURED'
      AND p.paid_at >= ${range.from}
      AND p.paid_at <= ${range.to}
      AND a.status = 'COMPLETED'
      ${svcFilter}
      ${specFilter}
    GROUP BY bucket, svc.id, svc.name
    ORDER BY bucket, svc.id
    LIMIT 5000
  `;
  return rows.map((r) => ({
    bucket:    r.bucket,
    revenue:   Number(r.revenue),
    bookings:  Number(r.bookings),
    entityId:  r.service_id,
    entityName: r.name,
  }));
}

// ─── Breakdown table ──────────────────────────────────────────────────────────

export interface EmployeeBreakdownRaw {
  specialistId:     string;
  firstName:        string;
  lastName:         string;
  avatarUrl:        string | null;
  bookings:         number;
  revenue:          number;
  cancellations:    number;
  commissionEarned: number;
  topServiceName:   string;
}

export interface ServiceBreakdownRaw {
  serviceId:     string;
  serviceName:   string;
  category:      string;
  bookings:      number;
  revenue:       number;
  avgDuration:   number;
  cancellations: number;
  topEmployee:   string;
}

export async function fetchEmployeeBreakdown(
  range:       DateRange,
  employeeIds: string[],
  serviceIds:  string[],
  page:        number,
  limit:       number,
  sortBy:      string,
  sortOrder:   'asc' | 'desc',
): Promise<{ rows: EmployeeBreakdownRaw[]; total: number }> {
  const specFilter = employeeIds.length
    ? Prisma.sql`AND s.id = ANY(${Prisma.sql`ARRAY[${Prisma.join(employeeIds.map((id) => Prisma.sql`${id}::uuid`))}]`})`
    : Prisma.empty;
  const svcFilter = serviceIds.length
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM appointment_services aps WHERE aps.appointment_id = a.id AND aps.service_id = ANY(${Prisma.sql`ARRAY[${Prisma.join(serviceIds.map((id) => Prisma.sql`${id}::uuid`))}]`}))`
    : Prisma.empty;

  const orderCol = sanitizeOrderColumn(sortBy, ['bookings', 'revenue', 'avg_ticket', 'cancellations', 'commission_earned'], 'revenue');
  const dir = sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const offset = BigInt((page - 1) * limit);
  const take = BigInt(limit);

  const rows = await prisma.$queryRaw<{
    specialist_id:     string;
    first_name:        string;
    last_name:         string;
    avatar_url:        string | null;
    bookings:          bigint;
    revenue:           number;
    cancellations:     bigint;
    commission_earned: number;
    top_service:       string;
  }[]>`
    WITH completed AS (
      SELECT
        s.id AS specialist_id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        COUNT(DISTINCT a.id)                         AS bookings,
        COALESCE(SUM(p.amount), 0)::float             AS revenue,
        COALESCE(SUM(p.specialist_commission), 0)::float AS commission_earned
      FROM specialists s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN appointments a
        ON a.specialist_id = s.id
        AND a.status = 'COMPLETED'
        AND a.start_at >= ${range.from}
        AND a.start_at <= ${range.to}
        ${svcFilter}
      LEFT JOIN payments p
        ON p.appointment_id = a.id
        AND p.status = 'CAPTURED'
        AND p.paid_at >= ${range.from}
        AND p.paid_at <= ${range.to}
      WHERE s.status = 'ACTIVE'
        ${specFilter}
      GROUP BY s.id, u.first_name, u.last_name, u.avatar_url
    ),
    cancelled AS (
      SELECT a.specialist_id, COUNT(*) AS cancellations
      FROM appointments a
      WHERE a.status = 'CANCELLED'
        AND a.start_at >= ${range.from}
        AND a.start_at <= ${range.to}
        ${specFilter}
      GROUP BY a.specialist_id
    ),
    top_svc AS (
      SELECT DISTINCT ON (a.specialist_id)
        a.specialist_id,
        svc.name AS top_service
      FROM appointments a
      JOIN appointment_services aps ON aps.appointment_id = a.id
      JOIN services svc ON svc.id = aps.service_id
      WHERE a.status = 'COMPLETED'
        AND a.start_at >= ${range.from}
        AND a.start_at <= ${range.to}
        ${specFilter}
      GROUP BY a.specialist_id, svc.id, svc.name
      ORDER BY a.specialist_id, COUNT(*) DESC
    )
    SELECT
      c.specialist_id,
      c.first_name,
      c.last_name,
      c.avatar_url,
      c.bookings,
      c.revenue,
      COALESCE(ca.cancellations, 0) AS cancellations,
      c.commission_earned,
      COALESCE(ts.top_service, '') AS top_service
    FROM completed c
    LEFT JOIN cancelled ca ON ca.specialist_id = c.specialist_id
    LEFT JOIN top_svc ts ON ts.specialist_id = c.specialist_id
    ORDER BY ${Prisma.raw(orderCol)} ${dir}
    LIMIT ${take} OFFSET ${offset}
  `;

  const countResult = await prisma.$queryRaw<[{ cnt: bigint }]>`
    SELECT COUNT(DISTINCT s.id) AS cnt
    FROM specialists s
    WHERE s.status = 'ACTIVE'
    ${specFilter}
  `;

  return {
    rows: rows.map((r) => ({
      specialistId:     r.specialist_id,
      firstName:        r.first_name,
      lastName:         r.last_name,
      avatarUrl:        r.avatar_url,
      bookings:         Number(r.bookings),
      revenue:          Number(r.revenue),
      cancellations:    Number(r.cancellations),
      commissionEarned: Number(r.commission_earned),
      topServiceName:   r.top_service,
    })),
    total: Number(countResult[0]?.cnt ?? 0),
  };
}

export async function fetchServiceBreakdown(
  range:       DateRange,
  employeeIds: string[],
  serviceIds:  string[],
  page:        number,
  limit:       number,
  sortBy:      string,
  sortOrder:   'asc' | 'desc',
): Promise<{ rows: ServiceBreakdownRaw[]; total: number }> {
  const specFilter = employeeIds.length
    ? Prisma.sql`AND a.specialist_id = ANY(${Prisma.sql`ARRAY[${Prisma.join(employeeIds.map((id) => Prisma.sql`${id}::uuid`))}]`})`
    : Prisma.empty;
  const svcWhere = serviceIds.length
    ? Prisma.sql`AND svc.id = ANY(${Prisma.sql`ARRAY[${Prisma.join(serviceIds.map((id) => Prisma.sql`${id}::uuid`))}]`})`
    : Prisma.empty;

  const orderCol = sanitizeOrderColumn(sortBy, ['bookings', 'revenue', 'avg_duration', 'cancellations'], 'revenue');
  const dir = sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const offset = BigInt((page - 1) * limit);
  const take = BigInt(limit);

  const rows = await prisma.$queryRaw<{
    service_id:   string;
    service_name: string;
    category:     string;
    bookings:     bigint;
    revenue:      number;
    avg_duration: number;
    cancellations: bigint;
    top_employee: string;
  }[]>`
    WITH completed AS (
      SELECT
        svc.id   AS service_id,
        svc.name AS service_name,
        svc.category::text AS category,
        COUNT(DISTINCT a.id)              AS bookings,
        COALESCE(SUM(p.amount / NULLIF(svc_cnt.cnt, 0)), 0)::float AS revenue,
        COALESCE(AVG(aps.duration), 0)::float AS avg_duration
      FROM services svc
      JOIN appointment_services aps ON aps.service_id = svc.id
      JOIN appointments a ON a.id = aps.appointment_id
        AND a.status = 'COMPLETED'
        AND a.start_at >= ${range.from}
        AND a.start_at <= ${range.to}
        ${specFilter}
      LEFT JOIN payments p ON p.appointment_id = a.id AND p.status = 'CAPTURED'
        AND p.paid_at >= ${range.from} AND p.paid_at <= ${range.to}
      JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM appointment_services WHERE appointment_id = a.id
      ) svc_cnt ON true
      WHERE svc.is_active = true
        ${svcWhere}
      GROUP BY svc.id, svc.name, svc.category
    ),
    cancelled AS (
      SELECT aps2.service_id, COUNT(DISTINCT a2.id) AS cancellations
      FROM appointments a2
      JOIN appointment_services aps2 ON aps2.appointment_id = a2.id
      WHERE a2.status = 'CANCELLED'
        AND a2.start_at >= ${range.from}
        AND a2.start_at <= ${range.to}
        ${svcWhere}
        ${specFilter}
      GROUP BY aps2.service_id
    ),
    top_emp AS (
      SELECT DISTINCT ON (aps3.service_id)
        aps3.service_id,
        u.first_name || ' ' || u.last_name AS top_employee
      FROM appointment_services aps3
      JOIN appointments a3 ON a3.id = aps3.appointment_id
        AND a3.status = 'COMPLETED'
        AND a3.start_at >= ${range.from}
        AND a3.start_at <= ${range.to}
      JOIN specialists sp ON sp.id = a3.specialist_id
      JOIN users u ON u.id = sp.user_id
      GROUP BY aps3.service_id, sp.id, u.first_name, u.last_name
      ORDER BY aps3.service_id, COUNT(*) DESC
    )
    SELECT
      c.service_id,
      c.service_name,
      c.category,
      c.bookings,
      c.revenue,
      c.avg_duration,
      COALESCE(ca.cancellations, 0) AS cancellations,
      COALESCE(te.top_employee, '') AS top_employee
    FROM completed c
    LEFT JOIN cancelled ca ON ca.service_id = c.service_id
    LEFT JOIN top_emp te ON te.service_id = c.service_id
    ORDER BY ${Prisma.raw(orderCol)} ${dir}
    LIMIT ${take} OFFSET ${offset}
  `;

  const countResult = await prisma.$queryRaw<[{ cnt: bigint }]>`
    SELECT COUNT(DISTINCT svc.id) AS cnt
    FROM services svc
    WHERE svc.is_active = true
    ${svcWhere}
  `;

  return {
    rows: rows.map((r) => ({
      serviceId:   r.service_id,
      serviceName: r.service_name,
      category:    r.category,
      bookings:    Number(r.bookings),
      revenue:     Number(r.revenue),
      avgDuration: Math.round(Number(r.avg_duration)),
      cancellations: Number(r.cancellations),
      topEmployee: r.top_employee,
    })),
    total: Number(countResult[0]?.cnt ?? 0),
  };
}

// ─── Sale completion ──────────────────────────────────────────────────────────

export interface SaleCompletionResult {
  alreadyProcessed: boolean;
  bookingId:    string;
  clientId:     string;
  clientName:   string;
  specialistId: string;
  specialistName: string;
  serviceNames: string[];
  amount:       number;
  currency:     string;
  paidAt:       Date;
}

export async function markSaleComplete(
  bookingId:     string,
  transactionId: string,
): Promise<SaleCompletionResult> {
  return prisma.$transaction(async (tx) => {
    // Load payment to check idempotency
    const payment = await tx.payment.findUnique({
      where: { id: transactionId },
      include: {
        appointment: {
          include: {
            client: true,
            specialist: { include: { user: true } },
            services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (payment.appointmentId !== bookingId) throw new Error('PAYMENT_BOOKING_MISMATCH');

    // Idempotency: check if already notified
    const meta = payment.metadata as Record<string, unknown> | null;
    if (meta?.notifiedAt) {
      return {
        alreadyProcessed: true,
        bookingId,
        clientId:      payment.appointment.clientId,
        clientName:    `${payment.appointment.client.firstName} ${payment.appointment.client.lastName}`,
        specialistId:  payment.appointment.specialistId,
        specialistName: `${payment.appointment.specialist.user.firstName} ${payment.appointment.specialist.user.lastName}`,
        serviceNames:  payment.appointment.services.map((s) => s.service.name),
        amount:        payment.amount.toNumber(),
        currency:      payment.currency,
        paidAt:        payment.paidAt ?? new Date(),
      };
    }

    // Update booking to COMPLETED if not already
    if (payment.appointment.status !== 'COMPLETED') {
      await tx.appointment.update({
        where: { id: bookingId },
        data:  { status: 'COMPLETED' },
      });
    }

    // Update payment to CAPTURED if not already
    if (payment.status !== 'CAPTURED') {
      await tx.payment.update({
        where: { id: transactionId },
        data:  { status: 'CAPTURED', paidAt: new Date() },
      });
    }

    // Stamp notifiedAt to prevent duplicate notifications
    await tx.payment.update({
      where: { id: transactionId },
      data:  {
        metadata: {
          ...(meta ?? {}),
          notifiedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      alreadyProcessed: false,
      bookingId,
      clientId:      payment.appointment.clientId,
      clientName:    `${payment.appointment.client.firstName} ${payment.appointment.client.lastName}`,
      specialistId:  payment.appointment.specialistId,
      specialistName: `${payment.appointment.specialist.user.firstName} ${payment.appointment.specialist.user.lastName}`,
      serviceNames:  payment.appointment.services.map((s) => s.service.name),
      amount:        payment.amount.toNumber(),
      currency:      payment.currency,
      paidAt:        payment.paidAt ?? new Date(),
    };
  });
}

// ─── Recipient resolution ─────────────────────────────────────────────────────

export interface NotificationRecipient {
  userId: string;
  email:  string;
  role:   string;
}

/** Returns the users who should receive sale completion notifications. */
export async function fetchSaleNotificationRecipients(): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      role:   { in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
      status: 'ACTIVE',
    },
    select: { id: true, email: true, role: true },
  });

  return users.map((u) => ({
    userId: u.id,
    email:  u.email,
    role:   u.role,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_COLUMNS: Record<string, string> = {
  bookings:         'bookings',
  revenue:          'revenue',
  avg_ticket:       'revenue / NULLIF(bookings, 0)',
  cancellations:    'cancellations',
  commission_earned: 'commission_earned',
  avg_duration:     'avg_duration',
};

function sanitizeOrderColumn(
  sortBy:   string | undefined,
  allowed:  string[],
  fallback: string,
): string {
  const key = sortBy ?? fallback;
  if (!allowed.includes(key)) return ALLOWED_COLUMNS[fallback] ?? fallback;
  return ALLOWED_COLUMNS[key] ?? key;
}
