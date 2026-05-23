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

// Statuses that are considered terminal — no reassignment allowed
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']);

// Statuses excluded from conflict checks (they don't occupy a slot)
const SKIP_CONFLICT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.RESCHEDULED,
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await params;

  let body: { specialistId?: string; roomId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { specialistId: newSpecialistId, roomId: newRoomId } = body;

  if (!newSpecialistId && !newRoomId) {
    return apiError('BAD_REQUEST', 'At least one of specialistId or roomId must be provided', 400);
  }

  console.log('[ops/reassign]', { id, newSpecialistId, newRoomId, userId });

  try {
    // ── Load appointment ───────────────────────────────────────────────────────
    const apt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        specialistId: true,
        roomId: true,
        specialist: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        room: { select: { name: true } },
        services: { select: { serviceId: true } },
      },
    });

    if (!apt) {
      return apiError('NOT_FOUND', 'Appointment not found', 404);
    }

    // ── Guard: terminal status ─────────────────────────────────────────────────
    if (TERMINAL_STATUSES.has(apt.status)) {
      return apiError(
        'INVALID_STATUS',
        `Cannot reassign an appointment with status '${apt.status}'`,
        400,
      );
    }

    const updateData: { specialistId?: string; roomId?: string } = {};

    // ── Specialist reassignment checks ─────────────────────────────────────────
    if (newSpecialistId) {
      const serviceIds = apt.services.map(s => s.serviceId);

      // Check qualification: new specialist must be linked to at least one service in the appointment
      const qualifiedLink = await prisma.specialistService.findFirst({
        where: {
          specialistId: newSpecialistId,
          serviceId: { in: serviceIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (!qualifiedLink) {
        return apiError(
          'SPECIALIST_NOT_QUALIFIED',
          'The new specialist is not qualified for any service in this appointment',
          400,
        );
      }

      // Check time conflict for new specialist
      const conflict = await prisma.appointment.findFirst({
        where: {
          specialistId: newSpecialistId,
          id: { not: id }, // exclude current appointment
          status: { notIn: SKIP_CONFLICT_STATUSES },
          OR: [
            {
              startAt: { lt: apt.endAt },
              endAt: { gt: apt.startAt },
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
              message: 'The new specialist has a conflicting appointment at this time',
            },
          },
          { status: 409 },
        );
      }

      updateData.specialistId = newSpecialistId;
    }

    // ── Room reassignment checks ───────────────────────────────────────────────
    if (newRoomId) {
      const roomConflict = await prisma.appointment.findFirst({
        where: {
          roomId: newRoomId,
          id: { not: id },
          status: { notIn: SKIP_CONFLICT_STATUSES },
          OR: [
            {
              startAt: { lt: apt.endAt },
              endAt: { gt: apt.startAt },
            },
          ],
        },
        select: { id: true },
      });

      if (roomConflict) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROOM_CONFLICT',
              message: 'The room is occupied by another appointment at this time',
            },
          },
          { status: 409 },
        );
      }

      updateData.roomId = newRoomId;
    }

    // ── Apply update ───────────────────────────────────────────────────────────
    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      select: { id: true, specialistId: true, roomId: true },
    });

    // ── SSE broadcast ─────────────────────────────────────────────────────────
    broadcastOpsEvent({
      type: 'specialist_reassigned',
      appointmentId: id,
      specialistId: updated.specialistId ?? undefined,
      ts: new Date().toISOString(),
    });

    // ── Audit log ──────────────────────────────────────────────────────────────
    const { ipAddress, userAgent } = getRequestMeta(request);
    void logAudit({
      userId,
      role,
      action: 'REASSIGNED',
      entityType: 'appointment',
      entityId: id,
      appointmentId: id,
      oldValues: {
        specialistId: apt.specialistId,
        roomId: apt.roomId,
      },
      newValues: updateData,
      ipAddress,
      userAgent,
      metadata: { source: 'ops/reassign' },
    });

    console.log('[ops/reassign] done', { id, updateData });

    return ok({ id: updated.id, specialistId: updated.specialistId, roomId: updated.roomId });
  } catch (err) {
    console.error('[ops/reassign] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to reassign appointment', 500);
  }
}
