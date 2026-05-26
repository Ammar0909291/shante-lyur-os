export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const patchSchema = z.object({
  status:      z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(500).optional(),
});

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);
  if (!ADMIN_ROLES.includes(role)) return err('Requires Admin role', 403);

  const { id } = await context.params;

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON body', 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err('Validation failed: ' + parsed.error.issues[0]?.message, 400);

  const { status, reviewNotes } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schedReq = await (prisma as any).scheduleRequest.findUnique({
    where: { id },
    include: {
      specialist: {
        select: {
          userId:     true,
          user:       { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!schedReq) return err('Schedule request not found', 404);
  if (schedReq.status !== 'PENDING') return err('Request already reviewed', 409);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).scheduleRequest.update({
    where: { id },
    data: {
      status,
      reviewedBy:  userId,
      reviewNotes: reviewNotes ?? null,
      reviewedAt:  new Date(),
    },
  });

  // Notify the specialist
  const statusLabel = status === 'APPROVED' ? 'одобрен' : 'отклонён';
  await prisma.notification.create({
    data: {
      id:      crypto.randomUUID(),
      userId:  schedReq.specialist.userId,
      type:    'STAFF_ALERT',
      channel: 'IN_APP',
      status:  'SENT',
      title:   `График на ${schedReq.month} ${statusLabel}`,
      body:    reviewNotes
        ? `Комментарий администратора: ${reviewNotes}`
        : `Ваш график на ${schedReq.month} был ${statusLabel}.`,
      data:    { scheduleRequestId: id, month: schedReq.month },
      sentAt:  new Date(),
    },
  });

  return ok({ id, status, reviewNotes: reviewNotes ?? null });
}
