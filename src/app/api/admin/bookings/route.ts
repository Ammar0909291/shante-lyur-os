export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// ─── Scheduling constants ────────────────────────────────────────────────────
const MASSAGE_BUFFER_MINUTES = 30;
const MASSAGE_BUFFER_MS = MASSAGE_BUFFER_MINUTES * 60_000;
const SLOT_INTERVAL_MS = 30 * 60_000; // suggest in 30-min increments
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] as const;

/**
 * Find up to `count` non-conflicting start times for a new booking.
 * Searches in 30-minute increments from `fromTime`.
 * isMassagist: applies 30-min buffer after each existing appointment.
 */
function findNextAvailableSlots(
  existingAppts: Array<{ startAt: Date; endAt: Date }>,
  durationMs: number,
  isMassagist: boolean,
  fromTime: Date,
  count = 3,
): string[] {
  const bufferMs = isMassagist ? MASSAGE_BUFFER_MS : 0;
  const slots: string[] = [];

  // Round fromTime up to next 30-min boundary
  const rem = fromTime.getTime() % SLOT_INTERVAL_MS;
  let candidate = new Date(rem === 0 ? fromTime : fromTime.getTime() + (SLOT_INTERVAL_MS - rem));

  for (let attempt = 0; attempt < 300 && slots.length < count; attempt++) {
    const candidateEnd = new Date(candidate.getTime() + durationMs);

    const hasConflict = existingAppts.some((appt) => {
      const effectiveEnd = new Date(appt.endAt.getTime() + bufferMs);
      return candidate < effectiveEnd && candidateEnd > appt.startAt;
    });

    if (!hasConflict) slots.push(candidate.toISOString());

    candidate = new Date(candidate.getTime() + SLOT_INTERVAL_MS);
  }

  return slots;
}

// ─── List schema ─────────────────────────────────────────────────────────────
const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  specialistId: z.string().uuid().optional(),
});

// ─── Create schema ────────────────────────────────────────────────────────────
const CreateSchema = z.object({
  clientId: z.string().uuid(),
  specialistId: z.string().uuid(),
  locationId: z.string().uuid(),
  startAt: z.coerce.date(),
  services: z.array(z.object({
    serviceId: z.string().uuid(),
    price: z.number().nonnegative(),
    duration: z.number().int().positive(),
    sortOrder: z.number().int().min(0).default(0),
  })).min(1),
  notes: z.string().max(2000).optional(),
  source: z.enum(['web', 'phone', 'walkin', 'admin']).default('admin'),
  soldByUserId: z.string().uuid().optional(),
  /** Only SUPER_ADMIN / ADMIN may use this to bypass conflict checking */
  allowOverlap: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((v, k) => { raw[k] = v; });

    const parsed = ListSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query', 400, { issues: parsed.error.issues });
    }

    const { page, limit, from, to, status, specialistId } = parsed.data;

    const where: Record<string, unknown> = {};
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (specialistId) where.specialistId = specialistId;
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startAt as Record<string, unknown>).lte = new Date(to);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          client: { select: { id: true, firstName: true, lastName: true, email: true } },
          specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
          services: { include: { service: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    const sellerIds = Array.from(new Set(appointments.map((a) => a.soldByUserId).filter(Boolean) as string[]));
    const sellerUsers = sellerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const sellerMap = new Map(sellerUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    const items = appointments.map((a) => ({
      id: a.id,
      clientId: a.clientId,
      clientName: `${a.client.firstName} ${a.client.lastName}`,
      clientEmail: a.client.email,
      specialistId: a.specialistId,
      specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
      locationId: a.locationId,
      locationName: a.location.name,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      totalPrice: Number(a.totalPrice),
      totalDuration: a.totalDuration,
      notes: a.notes,
      soldByUserId: a.soldByUserId ?? null,
      soldByName: a.soldByUserId ? (sellerMap.get(a.soldByUserId) ?? null) : null,
      services: a.services.map((s) => ({
        serviceId: s.serviceId,
        name: s.service.name,
        price: Number(s.price),
        duration: s.duration,
      })),
      createdAt: a.createdAt,
    }));

    return ok({ items, total, page, limit });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const {
      clientId, specialistId, locationId, startAt, services,
      notes, source, soldByUserId: bodySeller, allowOverlap,
    } = parsed.data;

    const soldByUserId = bodySeller ?? req.headers.get('x-user-id') ?? undefined;
    const userRole = req.headers.get('x-user-role') ?? '';
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

    // ── 1. Category validation ───────────────────────────────────────────────
    const requestedServiceIds = services.map((s) => s.serviceId);
    const [specialistRecord, serviceRecords] = await Promise.all([
      prisma.specialist.findUnique({ where: { id: specialistId }, select: { specialization: true } }),
      prisma.service.findMany({ where: { id: { in: requestedServiceIds } }, select: { id: true, category: true } }),
    ]);
    if (!specialistRecord) return apiError('NOT_FOUND', 'Specialist not found', 404);

    const specLower = (specialistRecord.specialization ?? '').toLowerCase();
    const isMassagist = specLower.includes('массаж') || specLower.includes('spa') || specLower.includes('спа');
    const specialistType = isMassagist ? 'MASSAGE' : 'COSMETOLOGY';

    const forbidden = serviceRecords
      .filter((svc) => (svc.category === 'MASSAGE' ? 'MASSAGE' : 'COSMETOLOGY') !== specialistType)
      .map((svc) => svc.id);
    if (forbidden.length > 0) {
      return apiError('INVALID_SERVICE', 'Услуга не соответствует специализации специалиста', 422, { forbidden, specialistType });
    }

    // ── 2. Timing ────────────────────────────────────────────────────────────
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = Math.round(services.reduce((sum, s) => sum + s.price, 0) * 100) / 100;
    const totalDurationMs = totalDuration * 60_000;
    const endAt = new Date(startAt.getTime() + totalDurationMs);

    // ── 3. Overlap / conflict detection ──────────────────────────────────────
    // Fetch all active appointments for this specialist in a wide window.
    // We search [startAt - 8h, endAt + 8h] to catch any bookings whose duration
    // might overlap with the new slot (even long 2-3h treatments).
    const windowStart = new Date(startAt.getTime() - 8 * 3_600_000);
    const windowEnd   = new Date(endAt.getTime()   + 8 * 3_600_000);

    const existingAppts = await prisma.appointment.findMany({
      where: {
        specialistId,
        status: { in: [...ACTIVE_STATUSES] },
        startAt: { lt: windowEnd },
        endAt:   { gt: windowStart },
      },
      select: { id: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });

    // A new booking [startAt, endAt] conflicts with existing [existStart, existEnd] if:
    //   startAt < (existEnd + buffer) AND endAt > existStart
    // For massagists, buffer = 30 min after every appointment.
    const bufferMs = isMassagist ? MASSAGE_BUFFER_MS : 0;

    const conflicts = existingAppts.filter((appt) => {
      const effectiveEnd = new Date(appt.endAt.getTime() + bufferMs);
      return startAt < effectiveEnd && endAt > appt.startAt;
    });

    // Admin override: only honoured for SUPER_ADMIN / ADMIN roles
    const overrideApplied = isAdmin && allowOverlap === true;

    if (conflicts.length > 0 && !overrideApplied) {
      // Fetch broader window of future appointments to power accurate slot suggestions
      const futureAppts = await prisma.appointment.findMany({
        where: {
          specialistId,
          status: { in: [...ACTIVE_STATUSES] },
          startAt: { gte: startAt },
          endAt:   { lte: new Date(startAt.getTime() + 7 * 24 * 3_600_000) },
        },
        select: { startAt: true, endAt: true },
        orderBy: { startAt: 'asc' },
      });

      // Start suggesting from after the latest conflicting appointment (+ buffer)
      const latestConflictEnd = conflicts.reduce(
        (max, c) => Math.max(max, c.endAt.getTime()),
        0,
      );
      const suggestFrom = new Date(latestConflictEnd + bufferMs);

      const nextAvailableSlots = findNextAvailableSlots(
        futureAppts,
        totalDurationMs,
        isMassagist,
        suggestFrom,
      );

      const bufferNote = isMassagist
        ? ` (правило: +${MASSAGE_BUFFER_MINUTES} мин. перерыв после каждого массажа)`
        : '';

      return apiError(
        'CONFLICT',
        `Специалист занят в это время${bufferNote}`,
        409,
        {
          conflictingAt: conflicts.map((c) => ({
            startAt: c.startAt.toISOString(),
            endAt:   c.endAt.toISOString(),
          })),
          nextAvailableSlots,
          isMassagist,
          bufferMinutes: isMassagist ? MASSAGE_BUFFER_MINUTES : 0,
          adminCanOverride: true,
        },
      );
    }

    // ── 4. Create appointment ─────────────────────────────────────────────────
    const { randomUUID } = await import('crypto');

    const appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        clientId,
        specialistId,
        locationId,
        startAt,
        endAt,
        status: 'CONFIRMED',
        totalPrice,
        totalDuration,
        notes,
        source,
        soldByUserId,
        services: {
          create: services.map((s, i) => ({
            id: randomUUID(),
            serviceId: s.serviceId,
            price: s.price,
            duration: s.duration,
            sortOrder: s.sortOrder ?? i,
          })),
        },
      },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        services: { include: { service: { select: { name: true } } } },
        location: { select: { name: true } },
      },
    });

    // Audit: admin booking created
    const adminId = req.headers.get('x-user-id');
    const adminRole = req.headers.get('x-user-role') ?? '';
    const { ipAddress, userAgent } = getRequestMeta(req);
    void logAudit({
      userId: adminId,
      role: adminRole,
      action: 'CREATE',
      entityType: 'appointment',
      entityId: appointment.id,
      appointmentId: appointment.id,
      newValues: {
        clientId,
        specialistId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        totalPrice: Number(appointment.totalPrice),
        source,
        overrideApplied,
      },
      ipAddress,
      userAgent,
      metadata: { source: 'admin/bookings' },
    });

    // Set firstVisitAt on CustomerProfile if this is the client's first booking
    await prisma.customerProfile.upsert({
      where:  { userId: clientId },
      create: { id: randomUUID(), userId: clientId, firstVisitAt: startAt, loyaltyTier: 'BRONZE' },
      update: { firstVisitAt: undefined },
    }).then(async (profile) => {
      if (!profile.firstVisitAt) {
        await prisma.customerProfile.update({ where: { userId: clientId }, data: { firstVisitAt: startAt } });
      }
    }).catch(() => { /* non-fatal */ });

    return ok({
      id: appointment.id,
      clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
      specialistName: `${appointment.specialist.user.firstName} ${appointment.specialist.user.lastName}`,
      locationName: appointment.location.name,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      totalPrice: Number(appointment.totalPrice),
      totalDuration: appointment.totalDuration,
      overrideApplied,
    }, 201);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
