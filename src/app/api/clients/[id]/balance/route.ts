export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];

const AdjustSchema = z.object({
  amount:  z.number().refine((n) => n !== 0, { message: 'Amount must be nonzero' }),
  type:    z.enum(['TOP_UP', 'ADJUSTMENT']),
  note:    z.string().max(500).optional(),
});

interface Ctx { params: Promise<{ id: string }> }

// ─── GET /api/clients/[id]/balance ────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: Ctx) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id: clientId } = await ctx.params;

  try {
    const profile = await prisma.customerProfile.findUnique({
      where:  { userId: clientId },
      select: { prepaidBalance: true },
    });

    if (!profile) return apiError('NOT_FOUND', 'Client profile not found', 404);

    const transactions = await prisma.clientBalanceTransaction.findMany({
      where:   { clientId },
      select:  { id: true, amount: true, balanceAfter: true, type: true, note: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });

    return ok({
      balance: Number(profile.prepaidBalance),
      transactions: transactions.map((t) => ({
        id:           t.id,
        amount:       Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        type:         t.type,
        note:         t.note,
        createdAt:    t.createdAt,
      })),
    });
  } catch (err) {
    console.error('[clients/balance GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch balance', 500);
  }
}

// ─── POST /api/clients/[id]/balance ──────────────────────────────────────────

export async function POST(req: NextRequest, ctx: Ctx) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!ADMIN_ROLES.includes(role)) {
    return apiError('FORBIDDEN', 'Only admin/operator can adjust client balance', 403);
  }

  const { id: clientId } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }

  const parsed = AdjustSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body', 400);

  const { amount, type, note } = parsed.data;

  try {
    const profile = await prisma.customerProfile.findUnique({
      where:  { userId: clientId },
      select: { id: true, prepaidBalance: true },
    });

    if (!profile) return apiError('NOT_FOUND', 'Client profile not found', 404);

    const current    = Number(profile.prepaidBalance);
    const newBalance = current + amount;

    if (type === 'ADJUSTMENT' && newBalance < 0) {
      return apiError('INSUFFICIENT_BALANCE', `Adjustment would result in negative balance (${newBalance.toFixed(2)})`, 400);
    }

    let tx!: { id: string; amount: unknown; balanceAfter: unknown; type: string; note: string | null; createdAt: Date };

    await prisma.$transaction(async (trx) => {
      await trx.customerProfile.update({
        where: { id: profile.id },
        data:  { prepaidBalance: newBalance },
      });

      tx = await trx.clientBalanceTransaction.create({
        data: {
          clientId,
          amount,
          balanceAfter: newBalance,
          type:         type as never,
          note:         note ?? null,
          processedBy:  userId,
        },
        select: { id: true, amount: true, balanceAfter: true, type: true, note: true, createdAt: true },
      });

      await trx.auditLog.create({
        data: {
          userId,
          action:     'UPDATE',
          entityType: 'ClientBalance',
          entityId:   profile.id,
          oldValues:  { balance: current },
          newValues:  { balance: newBalance, amount, type, note },
        },
      });
    });

    return ok({
      balance: newBalance,
      transaction: {
        id:           tx.id,
        amount:       Number(tx.amount),
        balanceAfter: Number(tx.balanceAfter),
        type:         tx.type,
        note:         tx.note,
        createdAt:    tx.createdAt,
      },
    }, 201);
  } catch (err) {
    console.error('[clients/balance POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to adjust balance', 500);
  }
}
