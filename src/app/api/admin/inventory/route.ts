export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { InventoryCategory, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const VALID_CATEGORIES = Object.values(InventoryCategory);

const ListSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
  category: z.string().optional(),
  search:   z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
  active:   z.coerce.boolean().optional(),
});

const CreateSchema = z.object({
  name:         z.string().min(1).max(200),
  sku:          z.string().max(100).optional(),
  category:     z.enum(VALID_CATEGORIES as [string, ...string[]]) as z.ZodEnum<[InventoryCategory, ...InventoryCategory[]]>,
  unit:         z.string().min(1).max(20),
  currentStock: z.number().nonnegative().default(0),
  minStock:     z.number().nonnegative().default(0),
  costPerUnit:  z.number().nonnegative().optional(),
  supplier:     z.string().max(200).optional(),
  expiresAt:    z.coerce.date().optional(),
  notes:        z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((v, k) => { raw[k] = v; });
    const parsed = ListSchema.safeParse(raw);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid query', 400);

    const { page, limit, category, search, lowStock, active } = parsed.data;

    const where: Prisma.InventoryItemWhereInput = {};
    if (active !== undefined) where.isActive = active;
    else where.isActive = true;
    if (category) where.category = category as InventoryCategory;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStock) {
      where.AND = [
        { currentStock: { gt: 0 } },
      ];
      // We'll filter in JS for lowStock <= minStock since Prisma can't compare two columns directly
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const mapped = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock: Number(item.currentStock),
      minStock: Number(item.minStock),
      costPerUnit: item.costPerUnit !== null ? Number(item.costPerUnit) : null,
      supplier: item.supplier,
      expiresAt: item.expiresAt,
      isActive: item.isActive,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      stockStatus: getStockStatus(Number(item.currentStock), Number(item.minStock)),
      totalValue: item.costPerUnit !== null
        ? Math.round(Number(item.currentStock) * Number(item.costPerUnit) * 100) / 100
        : null,
    }));

    // Summary stats
    const allActive = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { currentStock: true, minStock: true, costPerUnit: true, expiresAt: true },
    });
    const lowStockCount = allActive.filter((i) => Number(i.currentStock) <= Number(i.minStock)).length;
    const totalValue = allActive.reduce((sum, i) => {
      if (!i.costPerUnit) return sum;
      return sum + Number(i.currentStock) * Number(i.costPerUnit);
    }, 0);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const expiringSoon = allActive.filter((i) => i.expiresAt && i.expiresAt <= thirtyDays && i.expiresAt >= now).length;

    return ok({ items: mapped, total, page, limit, summary: { lowStockCount, totalValue: Math.round(totalValue), expiringSoon } });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid body', 400, { issues: parsed.error.issues });

    const { randomUUID } = await import('crypto');
    const { name, sku, category, unit, currentStock, minStock, costPerUnit, supplier, expiresAt, notes } = parsed.data;

    const item = await prisma.inventoryItem.create({
      data: {
        id: randomUUID(),
        name, sku, category, unit,
        currentStock, minStock,
        costPerUnit: costPerUnit ?? null,
        supplier: supplier ?? null,
        expiresAt: expiresAt ?? null,
        notes: notes ?? null,
      },
    });

    // Create initial stock movement if stock > 0
    if (currentStock > 0) {
      const userId = req.headers.get('x-user-id') ?? undefined;
      await prisma.stockMovement.create({
        data: {
          id: randomUUID(),
          inventoryItemId: item.id,
          type: 'PURCHASE',
          quantity: currentStock,
          balanceAfter: currentStock,
          reason: 'Начальный остаток',
          userId: userId ?? null,
        },
      });
    }

    return ok({ ...item, currentStock: Number(item.currentStock), minStock: Number(item.minStock), costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return apiError('CONFLICT', 'SKU already exists', 409);
    }
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

function getStockStatus(current: number, min: number): 'ok' | 'low' | 'critical' | 'out' {
  if (current <= 0) return 'out';
  if (current <= min * 0.5) return 'critical';
  if (current <= min) return 'low';
  return 'ok';
}
