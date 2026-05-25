export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return R.unauthorized();

  const notification = await prisma.notification.findUnique({
    where:  { id: params.id },
    select: { userId: true, status: true },
  });

  if (!notification)              return R.notFound('Notification not found');
  if (notification.userId !== userId) return R.forbidden();
  if (notification.status === 'READ') return R.success({ alreadyRead: true });

  await prisma.notification.update({
    where: { id: params.id },
    data:  { status: 'READ', readAt: new Date() },
  });

  return R.success({ id: params.id, read: true });
}
