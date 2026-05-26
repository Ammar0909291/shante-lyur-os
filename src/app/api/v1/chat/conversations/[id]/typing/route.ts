export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { setTyping } from '@/lib/redis-client';
import { pushChatEvent, getOnlineUserIds } from '@/lib/chat-sse';

function ok() { return NextResponse.json({ success: true }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const { id: conversationId } = await params;

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member || member.leftAt) return err('Forbidden', 403);

  const user = await prisma.user.findUnique({
    where: { id: userId }, select: { firstName: true, lastName: true },
  });
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Сотрудник';

  await setTyping(conversationId, userId);

  // Push typing event to all online members in this conversation
  const otherMembers = await prisma.conversationMember.findMany({
    where: { conversationId, leftAt: null, userId: { not: userId } },
    select: { userId: true },
  });

  const onlineIds = new Set(getOnlineUserIds());
  const payload = { type: 'chat:typing' as const, conversationId, userId, userName };

  for (const m of otherMembers) {
    if (onlineIds.has(m.userId)) {
      pushChatEvent(m.userId, payload);
    }
  }

  return ok();
}
