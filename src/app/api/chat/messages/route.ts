export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { pushChatEvent, getOnlineUserIds } from '@/lib/chat-sse';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

const SendSchema = z.object({
  toUserId: z.string().uuid().optional(),
  body: z.string().min(1).max(4000),
});

export async function GET(req: NextRequest) {
  const currentUserId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!currentUserId) return apiError('Unauthorized', 401);

  const channelParam = req.nextUrl.searchParams.get('channel');
  const withUserId = req.nextUrl.searchParams.get('with');

  if (channelParam === 'public') {
    const messages = await prisma.internalMessage.findMany({
      where: { toUserId: { equals: null } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { id: true, fromUserId: true, toUserId: true, body: true, readAt: true, createdAt: true },
    });
    return ok(messages.map((m) => ({
      ...m,
      isOwn: m.fromUserId === currentUserId,
    })));
  }

  if (!withUserId) return apiError('Missing "with" or "channel" parameter', 400);

  const beforeStr = req.nextUrl.searchParams.get('before');
  const before = beforeStr ? new Date(beforeStr) : new Date();

  const messages = await prisma.internalMessage.findMany({
    where: {
      OR: [
        { fromUserId: currentUserId, toUserId: withUserId },
        { fromUserId: withUserId, toUserId: currentUserId },
      ],
      createdAt: { lte: before },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: { id: true, fromUserId: true, toUserId: true, body: true, readAt: true, createdAt: true },
  });

  await prisma.internalMessage.updateMany({
    where: { fromUserId: withUserId, toUserId: currentUserId, readAt: null },
    data: { readAt: new Date() },
  });

  return ok(messages.map((m) => ({
    ...m,
    isOwn: m.fromUserId === currentUserId,
  })));
}

export async function POST(req: NextRequest) {
  const currentUserId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!currentUserId) return apiError('Unauthorized', 401);

  const body: unknown = await req.json();
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid request body', 400);

  const { toUserId, body: messageBody } = parsed.data;

  // For DMs, verify recipient exists
  if (toUserId) {
    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true },
    });
    if (!recipient) return apiError('Recipient not found', 404);
  }

  const { randomUUID } = await import('crypto');
  const message = await prisma.internalMessage.create({
    data: {
      id: randomUUID(),
      fromUserId: currentUserId,
      toUserId: toUserId ?? undefined,
      body: messageBody,
    },
    select: { id: true, fromUserId: true, toUserId: true, body: true, readAt: true, createdAt: true },
  });

  const sender = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { firstName: true, lastName: true },
  });
  const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Сотрудник';

  const outboundMsg = {
    id: message.id,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
    isOwn: false,
  };

  if (toUserId) {
    // DM — push to recipient only
    pushChatEvent(toUserId, { type: 'message', message: outboundMsg, senderName });
  } else {
    // Public channel — push to all online users except sender
    const onlineIds = getOnlineUserIds().filter((id) => id !== currentUserId);
    for (const uid of onlineIds) {
      pushChatEvent(uid, { type: 'message', message: { ...outboundMsg, channel: 'public' }, senderName });
    }
  }

  return ok({ ...message, isOwn: true }, 201);
}
