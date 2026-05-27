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
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);
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
    id: p.id, code: p.code, description: p.description,
    discountType: p.discountType, discountValue: p.discountValue.toNumber(),
    maxUses: p.maxUses, currentUses: p.currentUses, maxUsesPerUser: p.maxUsesPerUser,
    minOrderAmount: p.minOrderAmount?.toNumber() ?? null,
    validFrom: p.validFrom.toISOString(), validUntil: p.validUntil.toISOString(),
    isActive: p.isActive, status, createdAt: p.createdAt.toISOString(),
    usageCount: p._count?.usages ?? p.currentUses,
  };
}

const UpdateSchema = z.object({
  description: z.string().max(500).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE']).optional(),
  discountValue: z.number().positive().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  minOrderAmount: z.number().positive().nullable().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { usages: true } },
        usages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            appointment: { select: { id: true, startAt: true, status: true } },
          },
        },
      },
    });
    if (!promo) return apiError('NOT_FOUND', 'Promo code not found', 404);

    return ok({
      ...mapCode(promo),
      recentUsages: promo.usages.map(u => ({
        id: u.id,
        discountAmount: Number(u.discountAmount),
        createdAt: u.createdAt.toISOString(),
        user: u.user,
        appointment: u.appointment
          ? { id: u.appointment.id, startAt: u.appointment.startAt.toISOString(), status: u.appointment.status }
          : null,
      })),
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  try {
    const existing = await prisma.promoCode.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('NOT_FOUND', 'Promo code not found', 404);

    const body: unknown = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '), 400);
    }

    const data = parsed.data;
    const updated = await prisma.promoCode.update({
      where: { id: params.id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.discountType !== undefined ? { discountType: data.discountType as DiscountType } : {}),
        ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
        ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
        ...(data.maxUsesPerUser !== undefined ? { maxUsesPerUser: data.maxUsesPerUser } : {}),
        ...(data.minOrderAmount !== undefined ? { minOrderAmount: data.minOrderAmount } : {}),
        ...(data.validFrom !== undefined ? { validFrom: data.validFrom } : {}),
        ...(data.validUntil !== undefined ? { validUntil: data.validUntil } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { _count: { select: { usages: true } } },
    });

    return ok(mapCode(updated));
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  try {
    const existing = await prisma.promoCode.findUnique({ where: { id: params.id }, include: { _count: { select: { usages: true } } } });
    if (!existing) return apiError('NOT_FOUND', 'Promo code not found', 404);

    if (existing._count.usages > 0) {
      // Soft-delete: deactivate rather than destroy (preserves audit trail)
      await prisma.promoCode.update({ where: { id: params.id }, data: { isActive: false } });
      return ok({ deleted: false, deactivated: true, message: 'Code has usage history — deactivated instead of deleted' });
    }

    await prisma.promoCode.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
