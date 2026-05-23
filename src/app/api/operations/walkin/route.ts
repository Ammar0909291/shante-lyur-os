export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { broadcastOpsEvent } from '@/lib/ops-sse';

/** POST /api/operations/walkin — create a walk-in appointment (receptionist only). */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['OPERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Receptionist/admin access required', 403);
  }

  let body: {
    clientId: string;
    specialistId: string;
    locationId?: string;
    startAt: string;
    serviceIds: string[];
    notes?: string;
    roomId?: string;
  };
  try { body = await request.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  if (!body.clientId) return apiError('BAD_REQUEST', 'clientId is required', 400);
  if (!body.specialistId) return apiError('BAD_REQUEST', 'specialistId is required', 400);
  if (!body.startAt) return apiError('BAD_REQUEST', 'startAt is required', 400);
  if (!body.serviceIds?.length) return apiError('BAD_REQUEST', 'serviceIds must be non-empty', 400);

  try {
    const startAt = new Date(body.startAt);
    if (isNaN(startAt.getTime())) return apiError('BAD_REQUEST', 'Invalid startAt date', 400);

    // Fetch services to calculate duration and price
    const services = await prisma.service.findMany({
      where: { id: { in: body.serviceIds }, isActive: true },
      select: { id: true, name: true, baseDuration: true, basePrice: true },
    });

    if (services.length !== body.serviceIds.length) {
      return apiError('BAD_REQUEST', 'One or more services not found or inactive', 400);
    }

    const totalDuration = services.reduce((sum, s) => sum + s.baseDuration, 0);
    const totalPrice = services.reduce((sum, s) => sum + Number(s.basePrice), 0);
    const endAt = new Date(startAt.getTime() + totalDuration * 60_000);

    // Resolve location: use provided or fall back to first active
    let locationId = body.locationId;
    if (!locationId) {
      const loc = await prisma.location.findFirst({ where: { isActive: true }, select: { id: true } });
      locationId = loc?.id;
    }
    if (!locationId) return apiError('BAD_REQUEST', 'No active location found', 400);

    // Conflict check: specialist not double-booked at this time
    const conflict = await prisma.appointment.findFirst({
      where: {
        specialistId: body.specialistId,
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (conflict) {
      return apiError('CONFLICT', 'Specialist has a conflicting appointment at this time', 409);
    }

    // Room conflict check
    if (body.roomId) {
      const roomConflict = await prisma.appointment.findFirst({
        where: {
          roomId: body.roomId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (roomConflict) {
        return apiError('CONFLICT', 'Room is already booked at this time', 409);
      }
    }

    // Create appointment with services
    const appointment = await prisma.appointment.create({
      data: {
        clientId: body.clientId,
        specialistId: body.specialistId,
        locationId,
        roomId: body.roomId ?? null,
        startAt,
        endAt,
        totalDuration,
        totalPrice,
        status: 'CONFIRMED',
        source: 'walkin',
        notes: body.notes ?? null,
        soldByUserId: userId,
        confirmedAt: new Date(),
        services: {
          create: services.map((s, i) => ({
            serviceId: s.id,
            price: s.basePrice,
            duration: s.baseDuration,
            sortOrder: i,
          })),
        },
      },
      include: {
        client: true,
        specialist: { include: { user: true } },
        room: true,
        services: { include: { service: true } },
      },
    });

    // Sync customer profile lastVisit / totalVisits (best-effort)
    void prisma.customerProfile.upsert({
      where: { userId: body.clientId },
      update: {},
      create: { userId: body.clientId },
    }).catch(() => {});

    // Broadcast SSE to all staff
    broadcastOpsEvent({
      type: 'booking_confirmed',
      appointmentId: appointment.id,
      clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
      specialistId: appointment.specialist?.id,
      specialistName: appointment.specialist
        ? `${appointment.specialist.user.firstName} ${appointment.specialist.user.lastName}`
        : undefined,
      roomName: appointment.room?.name ?? undefined,
      ts: new Date().toISOString(),
    });

    // Audit
    const { ipAddress, userAgent } = getRequestMeta(request);
    void logAudit({
      userId,
      role,
      action: 'CREATED',
      entityType: 'appointment',
      entityId: appointment.id,
      appointmentId: appointment.id,
      newValues: { source: 'walkin', status: 'CONFIRMED' },
      ipAddress,
      userAgent,
      metadata: { source: 'ops/walkin' },
    });

    return ok({ appointment });
  } catch (err) {
    console.error('[ops/walkin] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create walk-in appointment', 500);
  }
}
