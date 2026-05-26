export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { specialistId: string; id: string } },
) {
  const { specialistId, id } = params;

  const entry = await prisma.payrollEntry.findFirst({
    where: { id, specialistId, type: 'BONUS' },
  });
  if (!entry) return err('Entry not found or cannot be deleted', 404);
  if (entry.isLocked) return err('Entry is locked', 403);

  await prisma.payrollEntry.delete({ where: { id } });
  return ok({ deleted: true });
}
