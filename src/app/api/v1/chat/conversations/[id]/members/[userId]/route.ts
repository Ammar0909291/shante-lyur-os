export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';

function ok() { return NextResponse.json({ success: true }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

type Params = { params: Promise<{ id: string; userId: string }> };

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export async function DELETE(req: NextRequest, { params }: Params) {
  const actorId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!actorId) return err('Unauthorized', 401);

  const { id: conversationId, userId: targetUserId } = await params;

  const [conversation, actor] = await Promise.all([
    prisma.conversation.findUnique({ where: { id: conversationId } }),
    prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
  ]);

  if (!conversation) return err('Conversation not found', 404);
  if (conversation.type !== 'GROUP') return err('Cannot remove members from a direct message', 400);

  const isSelf    = actorId === targetUserId;
  const isCreator = conversation.createdById === actorId;
  const isAdmin   = actor && ADMIN_ROLES.includes(actor.role);

  if (!isSelf && !isCreator && !isAdmin) return err('Forbidden', 403);

  const target = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
  });
  if (!target || target.leftAt) return err('Member not found', 404);

  const actorUser = await prisma.user.findUnique({
    where: { id: actorId }, select: { firstName: true, lastName: true },
  });
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId }, select: { firstName: true, lastName: true },
  });

  const actorName  = actorUser  ? `${actorUser.firstName} ${actorUser.lastName}`.trim()  : 'Пользователь';
  const targetName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}`.trim() : 'Пользователь';
  const systemMsg  = isSelf
    ? `${targetName} покинул(а) чат`
    : `${actorName} удалил(а) ${targetName}`;

  await prisma.$transaction([
    prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { leftAt: new Date() },
    }),
    prisma.message.create({
      data: { conversationId, senderId: actorId, type: 'SYSTEM', content: systemMsg },
    }),
  ]);

  return ok();
}
