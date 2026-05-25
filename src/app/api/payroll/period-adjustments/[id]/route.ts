export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  const item = await prisma.periodAdjustment.findUnique({ where: { id: params.id } });
  if (!item) return err('NOT_FOUND', 'Adjustment not found', 404);

  await prisma.periodAdjustment.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
