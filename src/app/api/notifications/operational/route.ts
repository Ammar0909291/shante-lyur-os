export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

/** GET /api/notifications/operational — unread + recent IN_APP notifications for current user */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId, channel: 'IN_APP' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true,
        appointmentId: true,
      },
    });

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return ok({ notifications, unreadCount });
  } catch (err) {
    console.error('[notifications/operational] GET error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load notifications', 500);
  }
}

/** POST /api/notifications/operational — create operational IN_APP notification */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  let body: { targetUserId: string; title: string; body: string; appointmentId?: string; data?: Record<string, unknown> };
  try { body = await request.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        userId: body.targetUserId,
        type: 'SYSTEM',
        channel: 'IN_APP',
        status: 'SENT',
        title: body.title,
        body: body.body,
        appointmentId: body.appointmentId ?? null,
        data: (body.data ?? {}) as Prisma.InputJsonValue,
        sentAt: new Date(),
      },
    });
    return ok({ notification });
  } catch (err) {
    console.error('[notifications/operational] POST error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create notification', 500);
  }
}
