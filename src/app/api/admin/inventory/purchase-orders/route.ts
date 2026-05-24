export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

function authHeaders(req: NextRequest) {
  return { userId: req.headers.get('x-user-id'), role: req.headers.get('x-user-role') ?? '' };
}

/** GET /api/admin/inventory/purchase-orders — paginated list */
export async function GET(req: NextRequest) {
  const { userId } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const supplierId = req.nextUrl.searchParams.get('supplierId') ?? undefined;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '50')));

  try {
    const where = {
      ...(status ? { status: status as 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED' } : {}),
      ...(supplierId ? { supplierId } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: { inventoryItem: { select: { id: true, name: true, unit: true, category: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return ok({
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        supplierId: o.supplierId,
        supplierName: o.supplier?.name ?? null,
        orderedAt: o.orderedAt?.toISOString() ?? null,
        expectedAt: o.expectedAt?.toISOString() ?? null,
        receivedAt: o.receivedAt?.toISOString() ?? null,
        totalCost: Number(o.totalCost),
        notes: o.notes,
        createdAt: o.createdAt.toISOString(),
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          inventoryItemId: i.inventoryItemId,
          itemName: i.inventoryItem.name,
          itemUnit: i.inventoryItem.unit,
          itemCategory: i.inventoryItem.category,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          receivedQty: Number(i.receivedQty),
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[purchase-orders] GET error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load orders', 500);
  }
}

/** POST /api/admin/inventory/purchase-orders — create draft order */
export async function POST(req: NextRequest) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) return apiError('FORBIDDEN', 'Not authorized', 403);

  let body: {
    supplierId?: string;
    status?: string;
    orderedAt?: string;
    expectedAt?: string;
    notes?: string;
    items: Array<{ inventoryItemId: string; quantity: number; unitCost: number }>;
  };
  try { body = await req.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  if (!body.items?.length) return apiError('BAD_REQUEST', 'items must be non-empty', 400);

  for (const item of body.items) {
    if (!item.inventoryItemId) return apiError('BAD_REQUEST', 'Each item needs inventoryItemId', 400);
    if (item.quantity <= 0) return apiError('BAD_REQUEST', 'quantity must be positive', 400);
    if (item.unitCost < 0) return apiError('BAD_REQUEST', 'unitCost must be >= 0', 400);
  }

  try {
    const totalCost = body.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: body.supplierId ?? null,
        status: (body.status as 'DRAFT' | 'ORDERED') ?? 'DRAFT',
        orderedAt: body.orderedAt ? new Date(body.orderedAt) : (body.status === 'ORDERED' ? new Date() : null),
        expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
        totalCost,
        notes: body.notes?.trim() ?? null,
        createdByUserId: userId,
        items: {
          create: body.items.map((i) => ({
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            receivedQty: 0,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
      },
    });

    return ok(order);
  } catch (err) {
    console.error('[purchase-orders] POST error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create order', 500);
  }
}
