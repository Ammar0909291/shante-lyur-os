export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

function authHeaders(req: NextRequest) {
  return { userId: req.headers.get('x-user-id'), role: req.headers.get('x-user-role') ?? '' };
}

/** PATCH /api/operations/rooms/[id]/equipment/[eqId] — update equipment */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eqId: string }> },
) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin required', 403);

  const { id, eqId } = await params;
  let body: { name?: string; description?: string; status?: string; lastServicedAt?: string; nextServiceAt?: string; notes?: string };
  try { body = await req.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  try {
    const equipment = await prisma.roomEquipment.update({
      where: { id: eqId, roomId: id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
        ...(body.status !== undefined ? { status: body.status as 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE' } : {}),
        ...(body.lastServicedAt !== undefined ? { lastServicedAt: body.lastServicedAt ? new Date(body.lastServicedAt) : null } : {}),
        ...(body.nextServiceAt !== undefined ? { nextServiceAt: body.nextServiceAt ? new Date(body.nextServiceAt) : null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
      },
    });
    return ok(equipment);
  } catch (err) {
    console.error('[room/equipment/[eqId]] PATCH error', err);
    return apiError('INTERNAL_ERROR', 'Failed to update equipment', 500);
  }
}

/** DELETE /api/operations/rooms/[id]/equipment/[eqId] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eqId: string }> },
) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin required', 403);

  const { id, eqId } = await params;
  try {
    await prisma.roomEquipment.delete({ where: { id: eqId, roomId: id } });
    return ok({ id: eqId });
  } catch (err) {
    console.error('[room/equipment/[eqId]] DELETE error', err);
    return apiError('INTERNAL_ERROR', 'Failed to delete equipment', 500);
  }
}
