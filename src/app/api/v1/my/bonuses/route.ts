export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);
  if (role === 'RECEPTIONIST') return err('Access denied', 403);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');
  if (!from || !to) return err('from and to are required');

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const bonuses = await prisma.payrollEntry.findMany({
    where: {
      specialistId: specialist.id,
      type: 'BONUS',
      createdAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, amount: true, description: true, createdAt: true, entryStatus: true },
  });

  return ok({
    bonuses: bonuses.map((b) => ({
      id:          b.id,
      amount:      Number(b.amount),
      description: b.description ?? '',
      createdAt:   b.createdAt,
      status:      b.entryStatus,
    })),
    total: bonuses.reduce((s, b) => s + Number(b.amount), 0),
  });
}
