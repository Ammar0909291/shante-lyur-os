export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!MANAGE_ROLES.includes(role)) return R.forbidden();

  const existing = await prisma.blockedTime.findUnique({ where: { id: params.id } });
  if (!existing) return R.notFound('Blocked time not found');

  await prisma.blockedTime.delete({ where: { id: params.id } });

  return R.success({ deleted: true });
}
