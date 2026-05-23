export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

function authHeaders(req: NextRequest) {
  return { userId: req.headers.get('x-user-id'), role: req.headers.get('x-user-role') ?? '' };
}

/** GET /api/operations/rooms/[id]/equipment — list room equipment */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  const { id } = await params;
  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { equipment: { orderBy: { name: 'asc' } } },
    });
    if (!room) return apiError('NOT_FOUND', 'Room not found', 404);

    return ok({
      room: { id: room.id, name: room.name, type: room.type },
      equipment: room.equipment.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        status: e.status,
        lastServicedAt: e.lastServicedAt?.toISOString() ?? null,
        nextServiceAt: e.nextServiceAt?.toISOString() ?? null,
        purchasedAt: e.purchasedAt?.toISOString() ?? null,
        notes: e.notes,
        daysUntilService: e.nextServiceAt
          ? Math.max(0, Math.ceil((e.nextServiceAt.getTime() - Date.now()) / 86_400_000))
          : null,
      })),
    });
  } catch (err) {
    console.error('[room/equipment] GET error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load equipment', 500);
  }
}

/** POST /api/operations/rooms/[id]/equipment — add equipment to room */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin required', 403);

  const { id } = await params;
  let body: { name: string; description?: string; status?: string; lastServicedAt?: string; nextServiceAt?: string; purchasedAt?: string; notes?: string };
  try { body = await req.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  if (!body.name?.trim()) return apiError('BAD_REQUEST', 'name is required', 400);

  try {
    const room = await prisma.room.findUnique({ where: { id }, select: { id: true } });
    if (!room) return apiError('NOT_FOUND', 'Room not found', 404);

    const equipment = await prisma.roomEquipment.create({
      data: {
        roomId: id,
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        status: (body.status as 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE') ?? 'OPERATIONAL',
        lastServicedAt: body.lastServicedAt ? new Date(body.lastServicedAt) : null,
        nextServiceAt: body.nextServiceAt ? new Date(body.nextServiceAt) : null,
        purchasedAt: body.purchasedAt ? new Date(body.purchasedAt) : null,
        notes: body.notes?.trim() ?? null,
      },
    });

    return ok(equipment);
  } catch (err) {
    console.error('[room/equipment] POST error', err);
    return apiError('INTERNAL_ERROR', 'Failed to add equipment', 500);
  }
}
