export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return err('Forbidden', 403);

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));
  const action     = searchParams.get('action')     ?? undefined;
  const entityType = searchParams.get('entityType') ?? undefined;
  const userId     = searchParams.get('userId')     ?? undefined;
  const from       = searchParams.get('from');
  const to         = searchParams.get('to');

  const where: Record<string, unknown> = {};
  if (action)     where['action']     = action;
  if (entityType) where['entityType'] = entityType;
  if (userId)     where['userId']     = userId;
  if (from || to) {
    where['createdAt'] = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id:         true,
        action:     true,
        entityType: true,
        entityId:   true,
        ipAddress:  true,
        createdAt:  true,
        metadata:   true,
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    }),
  ]);

  const items = logs.map((l) => ({
    id:         l.id,
    action:     l.action,
    entityType: l.entityType,
    entityId:   l.entityId,
    ipAddress:  l.ipAddress,
    createdAt:  l.createdAt.toISOString(),
    user:       l.user
      ? { name: `${l.user.firstName} ${l.user.lastName}`, email: l.user.email, role: l.user.role }
      : null,
    metadata: l.metadata,
  }));

  return ok({ items, total, page, limit, pages: Math.ceil(total / limit) });
}
