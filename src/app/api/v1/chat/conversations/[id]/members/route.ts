export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { pushChatEvent, getOnlineUserIds } from '@/lib/chat-sse';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

type Params = { params: Promise<{ id: string }> };

const EMPLOYEE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'];
const ADMIN_ROLES    = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const AddMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(18),
});

export async function POST(req: NextRequest, { params }: Params) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const { id: conversationId } = await params;

  const [conversation, actor] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: { where: { leftAt: null } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ]);

  if (!conversation) return err('Conversation not found', 404);
  if (conversation.type !== 'GROUP') return err('Cannot add members to a direct message', 400);

  const isCreator = conversation.createdById === userId;
  const isAdmin   = actor && ADMIN_ROLES.includes(actor.role);
  if (!isCreator && !isAdmin) return err('Forbidden', 403);

  if (conversation.members.length >= 20) return err('Group limit is 20 members', 400);

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = AddMembersSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const newMembers = await prisma.user.findMany({
    where: { id: { in: parsed.data.memberIds }, role: { in: EMPLOYEE_ROLES as never[] } },
    select: { id: true, firstName: true, lastName: true },
  });

  const actorUser = await prisma.user.findUnique({
    where: { id: userId }, select: { firstName: true, lastName: true },
  });
  const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}`.trim() : 'Пользователь';

  const currentMemberIds = new Set(conversation.members.map((m) => m.userId));
  const toAdd = newMembers.filter((u) => !currentMemberIds.has(u.id));

  if (toAdd.length === 0) return ok({ added: 0 });

  await prisma.$transaction(async (tx) => {
    // Upsert member records (handle re-join after leave)
    for (const u of toAdd) {
      await tx.conversationMember.upsert({
        where: { conversationId_userId: { conversationId, userId: u.id } },
        create: { conversationId, userId: u.id },
        update: { leftAt: null, joinedAt: new Date() },
      });
      const addedName = `${u.firstName} ${u.lastName}`.trim();
      await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: 'SYSTEM',
          content: `${actorName} добавил(а) ${addedName}`,
        },
      });
    }
  });

  const onlineIds = new Set(getOnlineUserIds());
  for (const u of toAdd) {
    if (onlineIds.has(u.id)) {
      pushChatEvent(u.id, { type: 'chat:conversation:new', conversationId });
    }
  }

  return ok({ added: toAdd.length });
}
