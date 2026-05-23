export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

/** POST /api/notifications/operational/read — mark notifications as read */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  let body: { ids?: string[] };
  try { body = await request.json() as typeof body; } catch { body = {}; }

  try {
    const now = new Date();
    if (body.ids?.length) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: { id: { in: body.ids }, userId, readAt: null },
        data: { readAt: now, status: 'READ', deliveredAt: now },
      });
    } else {
      // Mark all unread for this user
      await prisma.notification.updateMany({
        where: { userId, channel: 'IN_APP', readAt: null },
        data: { readAt: now, status: 'READ', deliveredAt: now },
      });
    }
    return ok({ marked: true });
  } catch (err) {
    console.error('[notifications/read] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to mark as read', 500);
  }
}
