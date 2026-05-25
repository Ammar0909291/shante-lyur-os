export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const CreateSchema = z.object({
  specialistId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!MANAGE_ROLES.includes(role)) return R.forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const d = parsed.data;

  const blocked = await prisma.blockedTime.create({
    data: {
      specialistId: d.specialistId,
      locationId: d.locationId ?? null,
      startAt: new Date(d.startAt),
      endAt: new Date(d.endAt),
      reason: d.reason ?? null,
      isRecurring: false,
    },
  });

  return R.success(blocked, 201);
}
