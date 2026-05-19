export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const UpdatePrefsSchema = z.object({
  notifyEmail: z.boolean().optional(),
  notifySms:   z.boolean().optional(),
  notifyPush:  z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyEmail: true, notifySms: true, notifyPush: true },
  });
  if (!user) return apiError('NOT_FOUND', 'User not found', 404);

  return ok(user);
}

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const body: unknown = await req.json();
  const parsed = UpdatePrefsSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request body', 400);

  const { notifyEmail, notifySms, notifyPush } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(notifyEmail !== undefined && { notifyEmail }),
      ...(notifySms   !== undefined && { notifySms }),
      ...(notifyPush  !== undefined && { notifyPush }),
    },
    select: { notifyEmail: true, notifySms: true, notifyPush: true },
  });

  return ok(updated);
}
