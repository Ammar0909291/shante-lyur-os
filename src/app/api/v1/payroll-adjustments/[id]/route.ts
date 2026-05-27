export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  void userId;

  const { id } = params;

  const entry = await prisma.payrollEntry.findUnique({ where: { id } });
  if (!entry) return R.notFound('Adjustment not found');
  if (entry.type !== 'ADJUSTMENT') return R.badRequest('Entry is not an adjustment');
  if (entry.isLocked) return R.badRequest('Entry is locked');

  await prisma.payrollEntry.delete({ where: { id } });

  return R.noContent();
}
