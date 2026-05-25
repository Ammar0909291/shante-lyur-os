export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const QuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});

const UNREAD_STATUSES = ['PENDING', 'SENT', 'DELIVERED'] as const;

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return R.unauthorized();

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return R.badRequest('Invalid parameters', parsed.error.issues);

  const { page, limit, unreadOnly } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(unreadOnly ? { status: { in: UNREAD_STATUSES as unknown as never[] } } : {}),
  };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id:          true,
        type:        true,
        channel:     true,
        status:      true,
        title:       true,
        body:        true,
        data:        true,
        sentAt:      true,
        readAt:      true,
        createdAt:   true,
        appointment: {
          select: { id: true, startAt: true },
        },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, status: { in: UNREAD_STATUSES as unknown as never[] } },
    }),
  ]);

  return R.success({
    items,
    total,
    page,
    limit,
    totalPages:  Math.ceil(total / limit),
    unreadCount,
  });
}
