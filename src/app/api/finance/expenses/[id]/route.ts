export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

const PatchSchema = z.object({
  amount:      z.number().positive().optional(),
  description: z.string().min(1).max(500).optional(),
  supplier:    z.string().max(255).nullable().optional(),
  receiptRef:  z.string().max(255).nullable().optional(),
  category:    z.enum(['INVENTORY_PURCHASE', 'RENT', 'UTILITIES', 'SALARY', 'OPERATIONAL', 'MARKETING', 'OTHER']).optional(),
}).refine((d) => Object.keys(d).length > 0, 'At least one field required');

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body', 400);

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return apiError('NOT_FOUND', 'Expense not found', 404);

    const updated = await prisma.expense.update({
      where: { id },
      data:  parsed.data as Record<string, unknown>,
      select: { id: true, date: true, category: true, amount: true, description: true, supplier: true, receiptRef: true, updatedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action:     'UPDATE',
        entityType: 'Expense',
        entityId:   id,
        oldValues:  { amount: existing.amount, description: existing.description },
        newValues:  parsed.data,
      },
    });

    return ok({
      id:          updated.id,
      date:        updated.date.toISOString().split('T')[0],
      category:    updated.category,
      amount:      Number(updated.amount),
      description: updated.description,
      supplier:    updated.supplier,
      receiptRef:  updated.receiptRef,
    });
  } catch (err) {
    console.error('[finance/expenses PATCH]', err);
    return apiError('INTERNAL_ERROR', 'Failed to update expense', 500);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await ctx.params;

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return apiError('NOT_FOUND', 'Expense not found', 404);

    await prisma.expense.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action:     'DELETE',
        entityType: 'Expense',
        entityId:   id,
        oldValues:  { amount: existing.amount, description: existing.description, category: existing.category },
      },
    });

    return ok({ id, deleted: true });
  } catch (err) {
    console.error('[finance/expenses DELETE]', err);
    return apiError('INTERNAL_ERROR', 'Failed to delete expense', 500);
  }
}
