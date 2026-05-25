export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];

const CreateSchema = z.object({
  specialistId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const d = parsed.data;

  const vacation = await prisma.vacation.create({
    data: {
      specialistId: d.specialistId,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      reason: d.reason ?? null,
      isApproved: false,
    },
  });

  return R.success(vacation, 201);
}
