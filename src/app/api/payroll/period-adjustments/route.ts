export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const PostSchema = z.object({
  userId:      z.string().uuid(),
  periodStart: z.string(),
  periodEnd:   z.string(),
  description: z.string().min(1).max(500),
  amount:      z.number(),
});

export async function GET(req: NextRequest) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  const params = req.nextUrl.searchParams;
  const userId = params.get('userId') ?? actorId;
  const from   = params.get('from') ? new Date(params.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to     = params.get('to')   ? new Date(params.get('to')!)   : new Date();

  const items = await prisma.periodAdjustment.findMany({
    where: {
      userId,
      periodStart: { gte: from },
      periodEnd:   { lte: to },
    },
    orderBy: { createdAt: 'asc' },
  });

  return ok({ adjustments: items.map((a) => ({ ...a, amount: Number(a.amount) })) });
}

export async function POST(req: NextRequest) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const d = parsed.data;
  const item = await prisma.periodAdjustment.create({
    data: {
      userId:      d.userId,
      periodStart: new Date(d.periodStart),
      periodEnd:   new Date(d.periodEnd),
      description: d.description,
      amount:      d.amount,
      createdBy:   actorId,
    },
  });

  return ok({ id: item.id, amount: Number(item.amount) });
}
