export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { pushChatEvent, getOnlineUserIds } from '@/lib/chat-sse';
import { getPresence, incrementUnread } from '@/lib/redis-client';
import { omnichannelQueue } from '@/infrastructure/queues/queue-registry';
import { DEFAULT_JOB_OPTIONS } from '@/infrastructure/queues/queue.config';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

type Params = { params: Promise<{ id: string }> };

// ── GET /api/v1/chat/conversations/[id]/messages ──────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const { id } = await params;
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10));
  const cursor = req.nextUrl.searchParams.get('cursor');

  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });
  if (!member || member.leftAt) return err('Forbidden', 403);

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      sender: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const hasMore = messages.length > limit;
  const items = messages.slice(0, limit).reverse().map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
    type: m.type,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    isOwn: m.senderId === userId,
  }));

  const nextCursor = hasMore ? messages[limit - 1]!.createdAt.toISOString() : null;

  return ok({ items, nextCursor });
}

// ── POST /api/v1/chat/conversations/[id]/messages ─────────────────────────────

const SendSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest, { params }: Params) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const { id: conversationId } = await params;

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member || member.leftAt) return err('Forbidden', 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true,
      specialist: { select: { specialization: true } },
    },
  });
  const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Сотрудник';
  const senderPosition = sender?.specialist?.specialization ?? null;
  const preview = parsed.data.content.slice(0, 150);

  // Save message + update conversation in one transaction
  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'TEXT',
        content: parsed.data.content,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: msg.createdAt, lastMessagePreview: preview },
    });
    return msg;
  });

  // Get all active members except sender
  const recipients = await prisma.conversationMember.findMany({
    where: { conversationId, leftAt: null, userId: { not: userId } },
    include: {
      user: {
        select: {
          id: true,
          communicationPreference: {
            select: { telegramEnabled: true, telegramChatId: true, emailEnabled: true },
          },
        },
      },
    },
  });

  const onlineIds = new Set(getOnlineUserIds());
  const msgPayload = {
    type: 'chat:message' as const,
    message: {
      id: message.id,
      conversationId,
      senderId: userId,
      senderName,
      type: message.type,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      isOwn: false,
    },
  };

  await Promise.all(
    recipients.map(async (r) => {
      const recipientId = r.userId;

      // Check if recipient is viewing this exact conversation
      const presence = await getPresence(recipientId);
      const isViewing = presence?.activePage === `/chat/${conversationId}` ||
                        presence?.activePage === `/chat?conv=${conversationId}`;

      // Always push SSE if online
      if (onlineIds.has(recipientId)) {
        pushChatEvent(recipientId, msgPayload);
      }

      // Always update unread + create DB notification (unless viewing)
      if (!isViewing) {
        await incrementUnread(recipientId, conversationId);

        await prisma.chatNotification.create({
          data: {
            recipientId,
            senderId: userId,
            conversationId,
            messageId: message.id,
            preview,
          },
        });

        // Telegram notification for offline/not-viewing users
        const pref = r.user.communicationPreference;
        if (!r.muted && pref?.telegramEnabled && pref.telegramChatId) {
          const outbound = await prisma.outboundMessage.create({
            data: {
              userId: recipientId,
              channel: 'TELEGRAM',
              provider: 'telegram',
              recipientChatId: pref.telegramChatId,
              body: `💬 ${senderName}: "${preview}"`,
              status: 'PENDING',
            },
          });
          // Deduplicated per sender per minute — batches rapid messages
          const minute = Math.floor(Date.now() / 60_000);
          await omnichannelQueue.add(
            'chat-telegram',
            {
              outboundMessageId: outbound.id,
              userId: recipientId,
              channel: 'telegram',
              templateKey: 'chat_notification',
              vars: { senderName, senderPosition: senderPosition ?? '', preview },
              lang: 'ru',
            },
            {
              ...DEFAULT_JOB_OPTIONS,
              jobId: `tg-chat:${recipientId}:${userId}:${minute}`,
            },
          ).catch(() => {});
        } else if (!r.muted && !presence?.online && pref?.emailEnabled) {
          // Delayed email fallback — only if no Telegram + offline
          const outbound = await prisma.outboundMessage.create({
            data: {
              userId: recipientId,
              channel: 'EMAIL',
              provider: 'email',
              body: `💬 ${senderName}: "${preview}"`,
              status: 'PENDING',
              scheduledAt: new Date(Date.now() + 600_000),
            },
          });
          await omnichannelQueue.add(
            'chat-email',
            {
              outboundMessageId: outbound.id,
              userId: recipientId,
              channel: 'email',
              templateKey: 'chat_notification_email',
              vars: { senderName, senderPosition: senderPosition ?? '', preview },
              lang: 'ru',
            },
            {
              ...DEFAULT_JOB_OPTIONS,
              delay: 600_000,
              jobId: `email-chat:${recipientId}:${conversationId}`,
            },
          ).catch(() => {});
        }
      }
    }),
  );

  // Also push to sender's own SSE so other tabs update
  pushChatEvent(userId, { ...msgPayload, message: { ...msgPayload.message, isOwn: true } });

  return ok({
    id: message.id,
    conversationId,
    senderId: userId,
    senderName,
    type: message.type,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    isOwn: true,
  }, );
}
