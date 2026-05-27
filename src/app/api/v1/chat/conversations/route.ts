export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { getConvUnread } from '@/lib/redis-client';
import { pushChatEvent, getOnlineUserIds } from '@/lib/chat-sse';
import { pushOpsEventToUser } from '@/lib/ops-sse';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const EMPLOYEE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'];

// ── GET /api/v1/chat/conversations ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const memberships = await prisma.conversationMember.findMany({
    where: { userId, leftAt: null },
    include: {
      conversation: {
        include: {
          members: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true, firstName: true, lastName: true, role: true,
                  specialist: { select: { specialization: true, color: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
  });

  const onlineIds = new Set(getOnlineUserIds());

  const items = await Promise.all(
    memberships.map(async (m) => {
      const conv = m.conversation;
      const otherMembers = conv.members.filter((mb) => mb.userId !== userId);
      const myMember = conv.members.find((mb) => mb.userId === userId);

      const unreadCount = await getConvUnread(userId, conv.id);

      const members = conv.members.map((mb) => ({
        id: mb.userId,
        name: `${mb.user.firstName} ${mb.user.lastName}`.trim(),
        position: mb.user.specialist?.specialization ?? mb.user.role,
        isOnline: onlineIds.has(mb.userId),
        color: mb.user.specialist?.color ?? null,
      }));

      const name =
        conv.type === 'DIRECT'
          ? (otherMembers[0]
              ? `${otherMembers[0].user.firstName} ${otherMembers[0].user.lastName}`.trim()
              : 'Удалённый пользователь')
          : (conv.name ?? 'Без названия');

      return {
        id: conv.id,
        type: conv.type,
        name,
        memberCount: conv.members.length,
        lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: conv.lastMessagePreview,
        unreadCount,
        muted: myMember?.muted ?? false,
        members,
      };
    }),
  );

  return ok({ items });
}

// ── POST /api/v1/chat/conversations ──────────────────────────────────────────

const CreateSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP']),
  name: z.string().min(1).max(200).optional(),
  memberIds: z.array(z.string().uuid()).min(1).max(99),
}).refine(
  (d) => d.type !== 'GROUP' || !!d.name,
  { message: 'Group name is required' },
);

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  if (!actor || !EMPLOYEE_ROLES.includes(actor.role)) return err('Forbidden', 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const { type, name, memberIds } = parsed.data;

  // Validate all members are employees in the system
  const members = await prisma.user.findMany({
    where: { id: { in: memberIds }, role: { in: EMPLOYEE_ROLES as never[] } },
    select: { id: true },
  });
  if (members.length !== memberIds.length) return err('One or more members not found', 404);

  const allMemberIds = [...new Set([userId, ...memberIds])];

  if (type === 'DIRECT') {
    const targetId = memberIds[0]!;
    // Find existing DIRECT conversation between these two users
    const existingMemberships = await prisma.conversationMember.findMany({
      where: { userId, leftAt: null, conversation: { type: 'DIRECT' } },
      select: { conversationId: true },
    });
    const myConvIds = existingMemberships.map((m) => m.conversationId);

    if (myConvIds.length > 0) {
      const partner = await prisma.conversationMember.findFirst({
        where: { userId: targetId, conversationId: { in: myConvIds }, leftAt: null },
        include: { conversation: true },
      });
      if (partner) {
        return ok({ conversationId: partner.conversationId, existing: true });
      }
    }
  }

  // Create conversation
  const conv = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        type,
        name: type === 'GROUP' ? name : null,
        createdById: userId,
        members: {
          create: allMemberIds.map((uid) => ({ userId: uid })),
        },
      },
    });

    if (type === 'GROUP') {
      const senderName = `${actor.firstName} ${actor.lastName}`.trim();
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          type: 'SYSTEM',
          content: `${senderName} создал(а) группу «${name}»`,
        },
      });
    }

    return conversation;
  });

  // Push SSE to all other online members (chat channel)
  const onlineIds = new Set(getOnlineUserIds());
  for (const uid of allMemberIds.filter((id) => id !== userId)) {
    if (onlineIds.has(uid)) {
      pushChatEvent(uid, { type: 'chat:conversation:new', conversationId: conv.id });
    }
  }

  // For GROUP conversations: create IN_APP notification for every non-creator member
  // and push an ops_refresh event so their notification bell refetches immediately.
  if (type === 'GROUP') {
    const creatorName = `${actor.firstName} ${actor.lastName}`.trim();
    const notifTitle = `Вы добавлены в группу «${name}»`;
    const notifBody = `Создатель: ${creatorName}`;
    const now = new Date();

    void (async () => {
      for (const uid of allMemberIds.filter((id) => id !== userId)) {
        try {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: 'STAFF_ALERT',
              channel: 'IN_APP',
              status: 'SENT',
              title: notifTitle,
              body: notifBody,
              data: { conversationId: conv.id, conversationType: 'GROUP' },
              sentAt: now,
            },
          });
          pushOpsEventToUser(uid, { type: 'ops_refresh', ts: now.toISOString() });
        } catch (err) {
          console.error('[chat/conversations] group notification error for', uid, err);
        }
      }
    })();
  }

  return ok({ conversationId: conv.id, existing: false });
}
