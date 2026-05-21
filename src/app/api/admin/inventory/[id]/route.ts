export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { InventoryCategory } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const VALID_CATEGORIES = Object.values(InventoryCategory);

const UpdateSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  sku:          z.string().max(100).nullable().optional(),
  category:     z.enum(VALID_CATEGORIES as [string, ...string[]]).optional() as z.ZodOptional<z.ZodEnum<[InventoryCategory, ...InventoryCategory[]]>>,
  unit:         z.string().min(1).max(20).optional(),
  minStock:     z.number().nonnegative().optional(),
  costPerUnit:  z.number().nonnegative().nullable().optional(),
  supplier:     z.string().max(200).nullable().optional(),
  expiresAt:    z.coerce.date().nullable().optional(),
  isActive:     z.boolean().optional(),
  notes:        z.string().max(2000).nullable().optional(),
});

interface RouteContext { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        serviceLinks: { include: { service: { select: { id: true, name: true, category: true } } } },
        movements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!item) return apiError('NOT_FOUND', 'Item not found', 404);
    return ok({
      ...item,
      currentStock: Number(item.currentStock),
      minStock: Number(item.minStock),
      costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
    });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) return apiError('NOT_FOUND', 'Item not found', 404);

    const body: unknown = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid body', 400);

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: parsed.data,
    });
    return ok({ ...updated, currentStock: Number(updated.currentStock), minStock: Number(updated.minStock), costPerUnit: updated.costPerUnit ? Number(updated.costPerUnit) : null });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) return apiError('NOT_FOUND', 'Item not found', 404);
    // Soft delete
    await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
    return ok({ id, deleted: true });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
