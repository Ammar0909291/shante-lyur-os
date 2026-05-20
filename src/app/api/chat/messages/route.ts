export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { pushChatEvent } from '@/lib/chat-sse';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

const SendSchema = z.object({
  toUserId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function GET(req: NextRequest) {
  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) return apiError('Unauthorized', 401);

  const withUserId = req.nextUrl.searchParams.get('with');
  if (!withUserId) return apiError('Missing "with" parameter', 400);

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
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });

  // Mark incoming messages as read
  await prisma.internalMessage.updateMany({
    where: {
      fromUserId: withUserId,
      toUserId: currentUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return ok(messages.map((m) => ({
    id: m.id,
    fromUserId: m.fromUserId,
    toUserId: m.toUserId,
    body: m.body,
    readAt: m.readAt,
    createdAt: m.createdAt,
    isOwn: m.fromUserId === currentUserId,
  })));
}

export async function POST(req: NextRequest) {
  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) return apiError('Unauthorized', 401);

  const body: unknown = await req.json();
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid request body', 400);

  const { toUserId, body: messageBody } = parsed.data;

  // Verify recipient exists and is a staff member
  const recipient = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  if (!recipient) return apiError('Recipient not found', 404);

  const { randomUUID } = await import('crypto');
  const message = await prisma.internalMessage.create({
    data: {
      id: randomUUID(),
      fromUserId: currentUserId,
      toUserId,
      body: messageBody,
    },
    select: { id: true, fromUserId: true, toUserId: true, body: true, readAt: true, createdAt: true },
  });

  const sender = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { firstName: true, lastName: true },
  });

  // Push SSE event to recipient
  pushChatEvent(toUserId, {
    type: 'message',
    message: {
      id: message.id,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
      isOwn: false,
    },
    senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Сотрудник',
  });

  return ok({ ...message, isOwn: true }, 201);
}
