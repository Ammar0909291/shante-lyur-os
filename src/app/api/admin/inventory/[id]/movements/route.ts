export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StockMovementType } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const VALID_TYPES = Object.values(StockMovementType);

const AddMovementSchema = z.object({
  type:     z.enum(VALID_TYPES as [string, ...string[]]) as z.ZodEnum<[StockMovementType, ...StockMovementType[]]>,
  quantity: z.number().positive(),
  reason:   z.string().max(500).optional(),
});

interface RouteContext { params: Promise<{ id: string }>; }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const page = Number(req.nextUrl.searchParams.get('page') ?? '1');
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '50'), 200);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { inventoryItemId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      prisma.stockMovement.count({ where: { inventoryItemId: id } }),
    ]);

    return ok({
      items: movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: Number(m.quantity),
        balanceAfter: Number(m.balanceAfter),
        reason: m.reason,
        appointmentId: m.appointmentId,
        userName: m.user ? `${m.user.firstName} ${m.user.lastName}` : null,
        createdAt: m.createdAt,
      })),
      total, page, limit,
    });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return apiError('NOT_FOUND', 'Item not found', 404);

    const body: unknown = await req.json();
    const parsed = AddMovementSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid body', 400);

    const { type, quantity, reason } = parsed.data;
    const userId = req.headers.get('x-user-id') ?? null;

    // Determine sign: PURCHASE/ADJUSTMENT(+) → add; USAGE/WASTE/RETURN(-) → subtract
    const isInbound = type === 'PURCHASE';
    const signedQty = isInbound ? quantity : -quantity;
    const newBalance = Number(item.currentStock) + signedQty;

    if (newBalance < 0) {
      return apiError('INSUFFICIENT_STOCK', `Недостаточно запаса. Текущий: ${Number(item.currentStock)} ${item.unit}`, 422);
    }

    const { randomUUID } = await import('crypto');
    const [updated, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id }, data: { currentStock: newBalance } }),
      prisma.stockMovement.create({
        data: {
          id: randomUUID(),
          inventoryItemId: id,
          type,
          quantity: signedQty,
          balanceAfter: newBalance,
          reason: reason ?? null,
          userId,
        },
      }),
    ]);

    return ok({
      currentStock: Number(updated.currentStock),
      movement: { id: movement.id, type: movement.type, quantity: Number(movement.quantity), balanceAfter: Number(movement.balanceAfter) },
    }, 201);
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
