export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DiscountType } from '@prisma/client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
function requireAdmin(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);
  return null;
}

function mapCode(p: {
  id: string; code: string; description: string | null;
  discountType: DiscountType; discountValue: { toNumber(): number };
  maxUses: number | null; currentUses: number; maxUsesPerUser: number;
  minOrderAmount: { toNumber(): number } | null;
  validFrom: Date; validUntil: Date;
  isActive: boolean; createdAt: Date;
  _count?: { usages: number };
}) {
  const now = new Date();
  const isExpired = p.validUntil < now;
  const isExhausted = p.maxUses !== null && p.currentUses >= p.maxUses;
  const status = !p.isActive ? 'inactive' : isExpired ? 'expired' : isExhausted ? 'exhausted' : 'active';
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    discountType: p.discountType,
    discountValue: p.discountValue.toNumber(),
    maxUses: p.maxUses,
    currentUses: p.currentUses,
    maxUsesPerUser: p.maxUsesPerUser,
    minOrderAmount: p.minOrderAmount?.toNumber() ?? null,
    validFrom: p.validFrom.toISOString(),
    validUntil: p.validUntil.toISOString(),
    isActive: p.isActive,
    status,
    createdAt: p.createdAt.toISOString(),
    usageCount: p._count?.usages ?? p.currentUses,
  };
}

const CreateSchema = z.object({
  code: z.string().min(2).max(50).toUpperCase().regex(/^[A-Z0-9_-]+$/, 'Code must be alphanumeric (A-Z, 0-9, _ -)'),
  description: z.string().max(500).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  minOrderAmount: z.number().positive().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  isActive: z.boolean().default(true),
}).refine(d => d.validUntil > d.validFrom, {
  message: 'validUntil must be after validFrom',
  path: ['validUntil'],
}).refine(d => d.discountType !== 'PERCENTAGE' || d.discountValue <= 100, {
  message: 'Percentage discount cannot exceed 100',
  path: ['discountValue'],
});

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  try {
    const params = req.nextUrl.searchParams;
    const page    = Math.max(1, parseInt(params.get('page') ?? '1'));
    const limit   = Math.min(100, parseInt(params.get('limit') ?? '20'));
    const search  = params.get('search')?.trim().toUpperCase() ?? '';
    const status  = params.get('status'); // 'active' | 'expired' | 'inactive' | 'all'
    const skip    = (page - 1) * limit;
    const now     = new Date();

    type WhereInput = NonNullable<Parameters<typeof prisma.promoCode.findMany>[0]>['where'];
    const where: WhereInput = {};
    if (search) where.code = { contains: search };
    if (status === 'active') {
      where.isActive = true;
      where.validFrom = { lte: now };
      where.validUntil = { gte: now };
    } else if (status === 'expired') {
      where.validUntil = { lt: now };
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [items, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { usages: true } } },
      }),
      prisma.promoCode.count({ where }),
    ]);

    return ok({ items: items.map(mapCode), total, page, limit });
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const userId = req.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '), 400);
    }

    const { code, description, discountType, discountValue, maxUses,
            maxUsesPerUser, minOrderAmount, validFrom, validUntil, isActive } = parsed.data;

    const existing = await prisma.promoCode.findUnique({ where: { code } });
    if (existing) return apiError('CONFLICT', `Promo code "${code}" already exists`, 409);

    const created = await prisma.promoCode.create({
      data: {
        code,
        description: description ?? null,
        discountType: discountType as DiscountType,
        discountValue,
        maxUses: maxUses ?? null,
        maxUsesPerUser,
        minOrderAmount: minOrderAmount ?? null,
        validFrom,
        validUntil,
        isActive,
        createdBy: userId,
      },
      include: { _count: { select: { usages: true } } },
    });

    return ok(mapCode(created), 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
