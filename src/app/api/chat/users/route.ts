export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { getOnlineUserIds } from '@/lib/chat-sse';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const currentUserId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!currentUserId) return apiError('Unauthorized', 401);

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      role: { in: ['ADMIN', 'SPECIALIST', 'OPERATOR'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });

  // Fetch specialist metadata separately to avoid relation include issues
  const specialistData = await prisma.specialist.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    select: { userId: true, specialization: true, color: true },
  });
  const specMap = new Map(specialistData.map((s) => [s.userId, s]));

  const onlineIds = new Set(getOnlineUserIds());

  return ok(
    users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      specialization: specMap.get(u.id)?.specialization ?? null,
      color: specMap.get(u.id)?.color ?? null,
      online: onlineIds.has(u.id),
    })),
  );
}
