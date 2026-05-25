export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const PatchSchema = z.object({
  approved: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const existing = await prisma.vacation.findUnique({ where: { id: params.id } });
  if (!existing) return R.notFound('Vacation not found');

  const { approved } = parsed.data;

  const vacation = await prisma.vacation.update({
    where: { id: params.id },
    data: {
      isApproved: approved,
      approvedBy: approved ? userId : null,
      approvedAt: approved ? new Date() : null,
    },
  });

  return R.success(vacation);
}
