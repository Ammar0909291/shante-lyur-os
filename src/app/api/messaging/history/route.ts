export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { prisma } from '@/infrastructure/config/prisma-client';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(params.get('limit') ?? '50', 10));
  const channel = params.get('channel') ?? undefined;
  const status = params.get('status') ?? undefined;
  const targetUserId = params.get('userId') ?? undefined;
  const days = parseInt(params.get('days') ?? '30', 10);

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role ?? '');
  const filterUserId = isAdmin && targetUserId ? targetUserId : userId;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const where = {
      ...(isAdmin ? {} : { userId: filterUserId }),
      ...(channel ? { channel: channel.toUpperCase() as never } : {}),
      ...(status ? { status: status.toUpperCase() as never } : {}),
      createdAt: { gte: since },
    };

    const [messages, total] = await Promise.all([
      prisma.outboundMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true, channel: true, provider: true, status: true,
          recipientPhone: true, recipientChatId: true, recipientEmail: true,
          body: true, externalId: true, retryCount: true,
          sentAt: true, deliveredAt: true, failedAt: true, errorMessage: true,
          createdAt: true, appointmentId: true,
          user: { select: { firstName: true, lastName: true, email: true } },
          template: { select: { key: true, name: true } },
        },
      }),
      prisma.outboundMessage.count({ where }),
    ]);

    return ok({ messages, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[API:messaging/history]', err);
    return apiError('INTERNAL_ERROR', 'Failed to load history', 500);
  }
}
