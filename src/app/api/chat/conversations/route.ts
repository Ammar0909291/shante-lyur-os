export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const currentUserId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!currentUserId) return apiError('Unauthorized', 401);

  // Get all unique conversation partners (exclude public channel where toUserId IS NULL)
  const sent = await prisma.internalMessage.findMany({
    where: { fromUserId: currentUserId, toUserId: { not: null } },
    select: { toUserId: true, createdAt: true, body: true },
    orderBy: { createdAt: 'desc' },
    distinct: ['toUserId'],
  });

  const received = await prisma.internalMessage.findMany({
    where: { toUserId: currentUserId },
    select: { fromUserId: true, createdAt: true, body: true },
    orderBy: { createdAt: 'desc' },
    distinct: ['fromUserId'],
  });

  const partnerIdSet = new Set([
    ...sent.map((m) => m.toUserId),
    ...received.map((m) => m.fromUserId),
  ]);
  const partnerIds = Array.from(partnerIdSet);

  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  const specRows = await prisma.specialist.findMany({
    where: { userId: { in: partnerIds } },
    select: { userId: true, specialization: true, color: true },
  });
  const specMap = new Map(specRows.map((s) => [s.userId, s]));

  // Build conversation list with last message + unread count
  const conversations = await Promise.all(
    partners.map(async (partner) => {
      const lastMessage = await prisma.internalMessage.findFirst({
        where: {
          OR: [
            { fromUserId: currentUserId, toUserId: partner.id },
            { fromUserId: partner.id, toUserId: currentUserId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { body: true, createdAt: true, fromUserId: true },
      });

      const unreadCount = await prisma.internalMessage.count({
        where: {
          fromUserId: partner.id,
          toUserId: currentUserId,
          readAt: null,
        },
      });

      return {
        partnerId: partner.id,
        partnerName: `${partner.firstName} ${partner.lastName}`,
        partnerRole: partner.role,
        specialization: specMap.get(partner.id)?.specialization ?? null,
        color: specMap.get(partner.id)?.color ?? null,
        lastMessage: lastMessage ? {
          body: lastMessage.body,
          createdAt: lastMessage.createdAt,
          isOwn: lastMessage.fromUserId === currentUserId,
        } : null,
        unreadCount,
      };
    }),
  );

  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
    const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return ok(conversations);
}
