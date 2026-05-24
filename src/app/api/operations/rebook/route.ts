export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { AppointmentStatus } from '@prisma/client';
import {
  ok,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { broadcastOpsEvent } from '@/lib/ops-sse';

// Statuses excluded from conflict checks (they don't occupy a slot)
const SKIP_CONFLICT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.RESCHEDULED,
];

interface RebookBody {
  appointmentId: string;
  startAt: string;
  specialistId?: string;
  roomId?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  let body: RebookBody;
  try {
    body = (await request.json()) as RebookBody;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { appointmentId, startAt, specialistId, roomId, notes } = body;

  if (!appointmentId || !startAt) {
    return apiError('BAD_REQUEST', 'appointmentId and startAt are required', 400);
  }

  const newStart = new Date(startAt);
  if (isNaN(newStart.getTime())) {
    return apiError('BAD_REQUEST', 'Invalid startAt date format', 400);
  }

  console.log('[ops/rebook]', { appointmentId, startAt, specialistId, roomId, userId });

  try {
    // ── Load source appointment ────────────────────────────────────────────────
    const source = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clientId: true,
        specialistId: true,
        locationId: true,
        roomId: true,
        totalDuration: true,
        totalPrice: true,
        status: true,
        services: {
          select: {
            serviceId: true,
            price: true,
            duration: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!source) {
      return apiError('SOURCE_NOT_FOUND', 'Source appointment not found', 404);
    }

    if (!source.services || source.services.length === 0) {
      return apiError('NO_SERVICES', 'Source appointment has no services — cannot rebook', 400);
    }

    // ── Compute end time ───────────────────────────────────────────────────────
    // Use source totalDuration; fall back to sum of service durations
    const totalDuration =
      source.totalDuration > 0
        ? source.totalDuration
        : source.services.reduce((sum, s) => sum + s.duration, 0);

    const newEnd = new Date(newStart.getTime() + totalDuration * 60_000);

    // ── Resolve specialist ─────────────────────────────────────────────────────
    const resolvedSpecialistId = specialistId ?? source.specialistId;

    // ── Check specialist conflict ──────────────────────────────────────────────
    const conflict = await prisma.appointment.findFirst({
      where: {
        specialistId: resolvedSpecialistId,
        status: { notIn: SKIP_CONFLICT_STATUSES },
        OR: [
          {
            startAt: { lt: newEnd },
            endAt: { gt: newStart },
          },
        ],
      },
      select: { id: true, startAt: true, endAt: true },
    });

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SPECIALIST_CONFLICT',
            message: 'The specialist has a conflicting appointment at the requested time',
            conflictingAppointmentId: conflict.id,
          },
        },
        { status: 409 },
      );
    }

    // ── Create new appointment and copy services atomically ───────────────────
    const newAppointment = await prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.create({
        data: {
          clientId: source.clientId,
          specialistId: resolvedSpecialistId,
          locationId: source.locationId,
          roomId: roomId ?? null,
          startAt: newStart,
          endAt: newEnd,
          totalDuration,
          totalPrice: source.totalPrice,
          status: 'PENDING',
          source: 'admin',
          notes: notes ?? `Rebooking from appointment ${source.id}`,
        },
        select: {
          id: true,
          clientId: true,
          specialistId: true,
          locationId: true,
          roomId: true,
          startAt: true,
          endAt: true,
          totalDuration: true,
          totalPrice: true,
          status: true,
          source: true,
          notes: true,
        },
      });

      // Copy all services from source appointment
      await tx.appointmentService.createMany({
        data: source.services.map((svc) => ({
          appointmentId: apt.id,
          serviceId: svc.serviceId,
          price: svc.price,
          duration: svc.duration,
          sortOrder: svc.sortOrder,
        })),
      });

      return apt;
    });

    // ── SSE broadcast ──────────────────────────────────────────────────────────
    broadcastOpsEvent({
      type: 'booking_confirmed',
      appointmentId: newAppointment.id,
      message: `Rebooking created from appointment ${source.id}`,
      ts: new Date().toISOString(),
    });

    // ── Audit log ──────────────────────────────────────────────────────────────
    const { ipAddress, userAgent } = getRequestMeta(request);
    void logAudit({
      userId,
      role,
      action: 'REBOOKED',
      entityType: 'appointment',
      entityId: newAppointment.id,
      appointmentId: newAppointment.id,
      oldValues: { sourceAppointmentId: source.id },
      newValues: {
        specialistId: resolvedSpecialistId,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
        roomId: roomId ?? null,
      },
      ipAddress,
      userAgent,
      metadata: { source: 'ops/rebook', sourceAppointmentId: source.id },
    });

    console.log('[ops/rebook] done', { newId: newAppointment.id, sourceId: source.id });

    return ok({
      appointment: {
        ...newAppointment,
        totalPrice: Number(newAppointment.totalPrice),
        startAt: newAppointment.startAt.toISOString(),
        endAt: newAppointment.endAt.toISOString(),
      },
      sourceAppointmentId: source.id,
    });
  } catch (err) {
    console.error('[ops/rebook] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create rebooking', 500);
  }
}
