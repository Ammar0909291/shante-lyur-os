export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

function authHeaders(req: NextRequest) {
  return { userId: req.headers.get('x-user-id'), role: req.headers.get('x-user-role') ?? '' };
}

/** PATCH /api/admin/inventory/suppliers/[id] */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin required', 403);

  const { id } = await params;
  let body: { name?: string; contactName?: string; phone?: string; email?: string; address?: string; website?: string; notes?: string; isActive?: boolean };
  try { body = await req.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.contactName !== undefined ? { contactName: body.contactName?.trim() ?? null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() ?? null } : {}),
        ...(body.email !== undefined ? { email: body.email?.trim() ?? null } : {}),
        ...(body.address !== undefined ? { address: body.address?.trim() ?? null } : {}),
        ...(body.website !== undefined ? { website: body.website?.trim() ?? null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    return ok(supplier);
  } catch (err) {
    console.error('[suppliers] PATCH error', err);
    return apiError('INTERNAL_ERROR', 'Failed to update supplier', 500);
  }
}

/** DELETE /api/admin/inventory/suppliers/[id] — soft delete */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin required', 403);

  const { id } = await params;
  try {
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    return ok({ id });
  } catch (err) {
    console.error('[suppliers] DELETE error', err);
    return apiError('INTERNAL_ERROR', 'Failed to deactivate supplier', 500);
  }
}
