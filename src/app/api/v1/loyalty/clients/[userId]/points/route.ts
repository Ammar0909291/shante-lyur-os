export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const PatchSchema = z.object({
  delta:  z.number().int().refine((n) => n !== 0, { message: 'delta must be nonzero' }),
  reason: z.string().min(1).max(500),
});

function calcTier(points: number): string {
  if (points >= 10000) return 'VIP';
  if (points >= 4000)  return 'PLATINUM';
  if (points >= 1500)  return 'GOLD';
  if (points >= 500)   return 'SILVER';
  return 'BRONZE';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const requestUserId = req.headers.get('x-user-id');
  const role          = req.headers.get('x-user-role');
  if (!requestUserId || !role) return R.unauthorized();
  if (!MANAGE_ROLES.includes(role)) return R.forbidden();

  const { userId } = params;

  let body: unknown;
  try { body = await req.json(); } catch { return R.badRequest('Invalid JSON body'); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const { delta, reason: _reason } = parsed.data;

  const profile = await prisma.customerProfile.findUnique({ where: { userId } });
  if (!profile) return R.notFound('Customer profile not found');

  const newPoints = Math.max(0, profile.loyaltyPoints + delta);
  const newTier   = calcTier(newPoints);

  const updated = await prisma.customerProfile.update({
    where: { userId },
    data:  { loyaltyPoints: newPoints, loyaltyTier: newTier },
    select: { userId: true, loyaltyPoints: true, loyaltyTier: true },
  });

  return R.success({
    userId:       updated.userId,
    loyaltyPoints: updated.loyaltyPoints,
    loyaltyTier:  updated.loyaltyTier,
  });
}
