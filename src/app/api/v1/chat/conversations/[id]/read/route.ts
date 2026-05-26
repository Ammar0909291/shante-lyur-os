export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { resetConvUnread } from '@/lib/redis-client';

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

  await Promise.all([
    resetConvUnread(userId, conversationId),
    prisma.chatNotification.updateMany({
      where: { recipientId: userId, conversationId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }),
  ]);

  return ok();
}
