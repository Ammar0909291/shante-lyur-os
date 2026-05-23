export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

function authHeaders(req: NextRequest) {
  return { userId: req.headers.get('x-user-id'), role: req.headers.get('x-user-role') ?? '' };
}

/** GET /api/admin/inventory/purchase-orders/[id] — full order with items */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  const { id } = await params;
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { inventoryItem: { select: { id: true, name: true, unit: true, category: true, currentStock: true } } } },
      },
    });
    if (!order) return apiError('NOT_FOUND', 'Order not found', 404);

    return ok({
      id: order.id,
      status: order.status,
      supplierId: order.supplierId,
      supplier: order.supplier ? { id: order.supplier.id, name: order.supplier.name } : null,
      orderedAt: order.orderedAt?.toISOString() ?? null,
      expectedAt: order.expectedAt?.toISOString() ?? null,
      receivedAt: order.receivedAt?.toISOString() ?? null,
      totalCost: Number(order.totalCost),
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        inventoryItemId: i.inventoryItemId,
        itemName: i.inventoryItem.name,
        itemUnit: i.inventoryItem.unit,
        itemCategory: i.inventoryItem.category,
        currentStock: Number(i.inventoryItem.currentStock),
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        receivedQty: Number(i.receivedQty),
        lineTotal: Number(i.quantity) * Number(i.unitCost),
      })),
    });
  } catch (err) {
    console.error('[purchase-orders] GET error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load order', 500);
  }
}

/** PATCH /api/admin/inventory/purchase-orders/[id] — update status/notes/dates */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(role)) return apiError('FORBIDDEN', 'Not authorized', 403);

  const { id } = await params;
  let body: { status?: string; notes?: string; orderedAt?: string; expectedAt?: string; supplierId?: string };
  try { body = await req.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  try {
    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status as 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED' } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
        ...(body.orderedAt !== undefined ? { orderedAt: body.orderedAt ? new Date(body.orderedAt) : null } : {}),
        ...(body.expectedAt !== undefined ? { expectedAt: body.expectedAt ? new Date(body.expectedAt) : null } : {}),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId || null } : {}),
      },
    });
    return ok(order);
  } catch (err) {
    console.error('[purchase-orders] PATCH error', err);
    return apiError('INTERNAL_ERROR', 'Failed to update order', 500);
  }
}
