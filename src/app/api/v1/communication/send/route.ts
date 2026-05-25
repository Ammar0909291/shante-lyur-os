export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const SEND_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const SendSchema = z.object({
  title:   z.string().min(1).max(255),
  body:    z.string().min(1).max(4000),
  type:    z.enum(['SYSTEM', 'PROMO_CODE', 'APPOINTMENT_REMINDER', 'WELCOME', 'PAYMENT_RECEIVED']).default('SYSTEM'),
  segment: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('ALL') }),
    z.object({ kind: z.literal('LOYALTY_TIER'), tier: z.string().min(1) }),
    z.object({ kind: z.literal('TAG'), tag: z.string().min(1) }),
    z.object({ kind: z.literal('INACTIVE_DAYS'), days: z.number().int().positive() }),
  ]),
});

async function resolveUserIds(segment: z.infer<typeof SendSchema>['segment']): Promise<string[]> {
  switch (segment.kind) {
    case 'ALL': {
      const rows = await prisma.customerProfile.findMany({ select: { userId: true } });
      return rows.map((r) => r.userId);
    }
    case 'LOYALTY_TIER': {
      const rows = await prisma.customerProfile.findMany({
        where: { loyaltyTier: segment.tier },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }
    case 'TAG': {
      const rows = await prisma.customerTag.findMany({
        where: { tag: segment.tag },
        select: { profile: { select: { userId: true } } },
      });
      return rows.map((r) => r.profile.userId);
    }
    case 'INACTIVE_DAYS': {
      const cutoff = new Date(Date.now() - segment.days * 86_400_000);
      const rows = await prisma.customerProfile.findMany({
        where: { OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }] },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!SEND_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  let body: unknown;
  try { body = await req.json(); } catch { return R.badRequest('Invalid JSON body'); }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const { title, body: msgBody, type, segment } = parsed.data;

  const targetUserIds = await resolveUserIds(segment);

  if (targetUserIds.length === 0) {
    return R.success({ sent: 0, message: 'No recipients matched the segment' });
  }

  const now = new Date();
  await prisma.notification.createMany({
    data: targetUserIds.map((uid) => ({
      userId:  uid,
      type:    type as never,
      channel: 'IN_APP' as never,
      status:  'SENT' as never,
      title,
      body:    msgBody,
      sentAt:  now,
    })),
    skipDuplicates: true,
  });

  return R.success({ sent: targetUserIds.length }, 201);
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!SEND_ROLES.includes(role)) return R.forbidden();

  const { searchParams } = new URL(req.url);
  const segment = searchParams.get('segment') ?? 'ALL';
  const tier    = searchParams.get('tier') ?? '';
  const tag     = searchParams.get('tag') ?? '';
  const days    = parseInt(searchParams.get('days') ?? '0', 10);

  let segObj: z.infer<typeof SendSchema>['segment'];
  if (segment === 'LOYALTY_TIER' && tier) {
    segObj = { kind: 'LOYALTY_TIER', tier };
  } else if (segment === 'TAG' && tag) {
    segObj = { kind: 'TAG', tag };
  } else if (segment === 'INACTIVE_DAYS' && days > 0) {
    segObj = { kind: 'INACTIVE_DAYS', days };
  } else {
    segObj = { kind: 'ALL' };
  }

  const ids = await resolveUserIds(segObj);
  return R.success({ count: ids.length });
}
