export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { getCurrentUserId } from '@/lib/auth-server';
import { broadcastOpsEvent } from '@/lib/ops-sse';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const TARGET_ROLES: Record<string, string[]> = {
  all:        ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'],
  specialists: ['COSMETOLOGIST', 'MASSAGIST'],
  managers:   ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
};

const BroadcastSchema = z.object({
  title:  z.string().min(1).max(255),
  body:   z.string().min(1).max(2000),
  target: z.enum(['all', 'specialists', 'managers']).default('all'),
});

/**
 * POST /api/v1/admin/notifications/broadcast
 * Admin-only endpoint to send an in-app notification to all active employees
 * (or a role subset) and immediately push an ops_refresh SSE event so their
 * notification bells refetch without a page reload.
 */
export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';

  if (!userId) return err('Unauthorized', 401);
  if (!ADMIN_ROLES.includes(role)) return err('Forbidden — admin role required', 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = BroadcastSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const { title, body: msgBody, target } = parsed.data;
  const roles = TARGET_ROLES[target]!;

  // Resolve recipients — all active users with matching roles, except the sender
  const recipients = await prisma.user.findMany({
    where: { role: { in: roles as never[] }, id: { not: userId } },
    select: { id: true },
  });

  if (recipients.length === 0) return ok({ sent: 0 });

  const now = new Date();

  // Create IN_APP notification for every recipient
  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type:    'STAFF_ALERT'    as const,
      channel: 'IN_APP'         as const,
      status:  'SENT'           as const,
      title,
      body: msgBody,
      data: { broadcastedBy: userId, target },
      sentAt: now,
    })),
    skipDuplicates: true,
  });

  // Notify all connected clients to refetch their bell
  broadcastOpsEvent({ type: 'ops_refresh', ts: now.toISOString() });

  return ok({ sent: recipients.length });
}
