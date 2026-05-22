export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const CreateSchema = z.object({
  inventoryItemId: z.string().uuid(),
  serviceId:       z.string().uuid(),
  quantityPerUse:  z.number().positive(),
});

// GET /api/admin/inventory/mappings?serviceId=X&itemId=Y
export async function GET(req: NextRequest) {
  try {
    const serviceId = req.nextUrl.searchParams.get('serviceId') ?? undefined;
    const itemId    = req.nextUrl.searchParams.get('itemId')    ?? undefined;

    const links = await prisma.inventoryServiceLink.findMany({
      where: {
        ...(serviceId ? { serviceId } : {}),
        ...(itemId    ? { inventoryItemId: itemId } : {}),
      },
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true, category: true, currentStock: true } },
        service:       { select: { id: true, name: true, category: true } },
      },
      orderBy: [{ service: { name: 'asc' } }, { inventoryItem: { name: 'asc' } }],
    });

    return ok(links.map((l) => ({
      id:              l.id,
      inventoryItemId: l.inventoryItemId,
      itemName:        l.inventoryItem.name,
      itemUnit:        l.inventoryItem.unit,
      itemCategory:    l.inventoryItem.category,
      itemStock:       Number(l.inventoryItem.currentStock),
      serviceId:       l.serviceId,
      serviceName:     l.service.name,
      serviceCategory: l.service.category,
      quantityPerUse:  Number(l.quantityPerUse),
      createdAt:       l.createdAt,
    })));
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

// POST /api/admin/inventory/mappings
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid body', 400);

    const { inventoryItemId, serviceId, quantityPerUse } = parsed.data;

    // Verify both exist
    const [item, service] = await Promise.all([
      prisma.inventoryItem.findUnique({ where: { id: inventoryItemId }, select: { id: true, name: true } }),
      prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, name: true } }),
    ]);
    if (!item)    return apiError('NOT_FOUND', 'Inventory item not found', 404);
    if (!service) return apiError('NOT_FOUND', 'Service not found', 404);

    const link = await prisma.inventoryServiceLink.create({
      data: { inventoryItemId, serviceId, quantityPerUse },
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true } },
        service:       { select: { id: true, name: true } },
      },
    });

    console.log('[inventory/mappings] created', { linkId: link.id, item: item.name, service: service.name, qty: quantityPerUse });

    return ok({
      id:             link.id,
      inventoryItemId: link.inventoryItemId,
      itemName:       link.inventoryItem.name,
      itemUnit:       link.inventoryItem.unit,
      serviceId:      link.serviceId,
      serviceName:    link.service.name,
      quantityPerUse: Number(link.quantityPerUse),
      createdAt:      link.createdAt,
    }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return apiError('CONFLICT', 'Mapping already exists for this item and service', 409);
    }
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
