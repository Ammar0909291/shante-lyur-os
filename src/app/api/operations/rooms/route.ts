export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  ok,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import type { RoomCreateBody } from '@/types/operations';

// ─── GET /api/operations/rooms ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);

  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        notes: true,
        locationId: true,
        appointments: {
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
          },
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
            client: { select: { firstName: true, lastName: true } },
            specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { startAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log('[ops/rooms] fetched', { count: rooms.length });

    return ok(rooms);
  } catch (err) {
    console.error('[ops/rooms GET] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch rooms', 500);
  }
}

// ─── POST /api/operations/rooms ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  // Only ADMIN/SUPER_ADMIN can create rooms
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Admin access required to create rooms', 403);
  }

  let body: RoomCreateBody;
  try {
    body = (await request.json()) as RoomCreateBody;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { name, type, locationId, notes } = body;
  if (!name?.trim() || !type || !locationId) {
    return apiError('BAD_REQUEST', 'name, type, and locationId are required', 400);
  }

  const validTypes = ['MASSAGE', 'COSMETOLOGY', 'GENERAL'];
  if (!validTypes.includes(type)) {
    return apiError('BAD_REQUEST', `type must be one of: ${validTypes.join(', ')}`, 400);
  }

  try {
    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        type,
        locationId,
        notes: notes?.trim() ?? null,
      },
      select: { id: true, name: true, type: true, locationId: true, notes: true, isActive: true, createdAt: true },
    });

    console.log('[ops/rooms POST] created room', { roomId: room.id, name: room.name });

    return Response.json({ success: true, data: room }, { status: 201 });
  } catch (err) {
    console.error('[ops/rooms POST] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create room', 500);
  }
}
