export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const UNREAD_STATUSES = ['PENDING', 'SENT', 'DELIVERED'] as const;

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return R.unauthorized();

  const result = await prisma.notification.updateMany({
    where:  { userId, status: { in: UNREAD_STATUSES as unknown as never[] } },
    data:   { status: 'READ', readAt: new Date() },
  });

  return R.success({ updated: result.count });
}
