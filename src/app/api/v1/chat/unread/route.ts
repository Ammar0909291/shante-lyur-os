export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { getTotalUnread, getConvUnread } from '@/lib/redis-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  // Get all active conversation memberships
  const memberships = await prisma.conversationMember.findMany({
    where: { userId, leftAt: null },
    include: { conversation: { select: { id: true, lastMessagePreview: true } } },
  });

  const conversations = await Promise.all(
    memberships.map(async (m) => ({
      conversationId: m.conversationId,
      unreadCount: await getConvUnread(userId, m.conversationId),
      lastMessagePreview: m.conversation.lastMessagePreview,
    })),
  );

  const redisTotal = await getTotalUnread(userId);

  // Use max of Redis total and sum of per-conv counts for accuracy
  const convTotal = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const total = Math.max(redisTotal, convTotal);

  return ok({
    total,
    conversations: conversations.filter((c) => c.unreadCount > 0),
  });
}
