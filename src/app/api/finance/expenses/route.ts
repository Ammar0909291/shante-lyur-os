export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

const CreateSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category:    z.enum(['INVENTORY_PURCHASE', 'RENT', 'UTILITIES', 'SALARY', 'OPERATIONAL', 'MARKETING', 'OTHER']),
  amount:      z.number().positive(),
  description: z.string().min(1).max(500),
  supplier:    z.string().max(255).optional(),
  receiptRef:  z.string().max(255).optional(),
});

// ─── GET /api/finance/expenses ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p        = req.nextUrl.searchParams;
  const from     = p.get('from');
  const to       = p.get('to');
  const category = p.get('category');

  try {
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to)   dateFilter.lte = new Date(to + 'T23:59:59Z');
      where.date = dateFilter;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        creator: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Category totals
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      const amt = Number(e.amount);
      total += amt;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + amt;
    }

    return ok({
      expenses: expenses.map((e) => ({
        id:          e.id,
        date:        e.date.toISOString().split('T')[0],
        category:    e.category,
        amount:      Number(e.amount),
        description: e.description,
        supplier:    e.supplier,
        receiptRef:  e.receiptRef,
        createdAt:   e.createdAt,
        createdBy:   e.creator ? `${e.creator.firstName} ${e.creator.lastName}` : null,
      })),
      total: Math.round(total * 100) / 100,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ),
    });
  } catch (err) {
    console.error('[finance/expenses GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch expenses', 500);
  }
}

// ─── POST /api/finance/expenses ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!userId) return apiError('UNAUTHORIZED', 'User ID required', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body', 400);

  const { date, category, amount, description, supplier, receiptRef } = parsed.data;

  try {
    const expense = await prisma.expense.create({
      data: {
        date:        new Date(date),
        category:    category as never,
        amount,
        description,
        supplier:    supplier ?? null,
        receiptRef:  receiptRef ?? null,
        createdBy:   userId,
      },
      select: { id: true, date: true, category: true, amount: true, description: true, supplier: true, receiptRef: true, createdAt: true },
    });

    // Audit trail
    await prisma.auditLog.create({
      data: {
        userId,
        action:     'CREATE',
        entityType: 'Expense',
        entityId:   expense.id,
        newValues:  { date, category, amount, description },
      },
    });

    return ok(
      {
        id:          expense.id,
        date:        expense.date.toISOString().split('T')[0],
        category:    expense.category,
        amount:      Number(expense.amount),
        description: expense.description,
        supplier:    expense.supplier,
        receiptRef:  expense.receiptRef,
        createdAt:   expense.createdAt,
      },
      201,
    );
  } catch (err) {
    console.error('[finance/expenses POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to create expense', 500);
  }
}
