export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

type Params = { params: Promise<{ id: string }> };

const MuteSchema = z.object({ muted: z.boolean() });

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const { id: conversationId } = await params;

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member || member.leftAt) return err('Forbidden', 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = MuteSchema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { muted: parsed.data.muted },
  });

  return ok({ muted: parsed.data.muted });
}
