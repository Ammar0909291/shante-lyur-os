export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { type AppointmentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  ok,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import type { RoomAssignBody } from '@/types/operations';
import { broadcastOpsEvent } from '@/lib/ops-sse';

// ─── POST /api/operations/rooms/[id]/assign ───────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id: roomId } = await params;

  let body: RoomAssignBody;
  try {
    body = (await request.json()) as RoomAssignBody;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { appointmentId } = body;
  if (!appointmentId) return apiError('BAD_REQUEST', 'appointmentId is required', 400);

  console.log('[ops/rooms/assign]', { roomId, appointmentId, userId });

  try {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true },
    });
    if (!room) return apiError('NOT_FOUND', 'Room not found', 404);

    // Fetch the appointment being assigned
    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, startAt: true, endAt: true, status: true },
    });
    if (!apt) return apiError('NOT_FOUND', 'Appointment not found', 404);

    if (['CANCELLED', 'NO_SHOW', 'RESCHEDULED', 'COMPLETED'].includes(apt.status as string)) {
      return apiError('BAD_REQUEST', 'Cannot assign room to a terminal appointment', 400);
    }

    // Check for room conflicts: overlapping active appointments in the same room
    const NON_ACTIVE: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'];
    const conflicts = await prisma.appointment.findMany({
      where: {
        id: { not: appointmentId },
        roomId,
        status: { notIn: NON_ACTIVE },
        startAt: { lt: apt.endAt },
        endAt: { gt: apt.startAt },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        clientId: true,
      },
    });

    if (conflicts.length > 0) {
      console.log('[ops/rooms/assign] conflict detected', { roomId, appointmentId, conflicts: conflicts.length });
      return Response.json(
        {
          success: false,
          error: { code: 'ROOM_CONFLICT', message: 'Room is already booked for this time slot' },
          conflicts: conflicts.map(c => ({
            id: c.id,
            startAt: c.startAt.toISOString(),
            endAt: c.endAt.toISOString(),
            clientId: c.clientId,
          })),
        },
        { status: 409 },
      );
    }

    // Assign room
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { roomId },
      select: { id: true, roomId: true },
    });

    console.log('[ops/rooms/assign] assigned', { roomId, appointmentId });

    broadcastOpsEvent({
      type: 'room_assigned',
      appointmentId,
      roomName: room.name,
      ts: new Date().toISOString(),
    });

    return ok({ appointmentId: updated.id, roomId: updated.roomId, roomName: room.name });
  } catch (err) {
    console.error('[ops/rooms/assign] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to assign room', 500);
  }
}
