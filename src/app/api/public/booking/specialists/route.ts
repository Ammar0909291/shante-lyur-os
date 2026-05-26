export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const dept = req.nextUrl.searchParams.get('dept');
  if (!dept || !['MASSAGE', 'COSMETOLOGY'].includes(dept)) {
    return err('dept must be MASSAGE or COSMETOLOGY');
  }

  const specialists = await prisma.specialist.findMany({
    where: { department: dept as 'MASSAGE' | 'COSMETOLOGY', status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      displayName: true,
      specialization: true,
      rating: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  const result = specialists.map((s) => ({
    id: s.id,
    name: s.displayName ?? `${s.user.firstName} ${s.user.lastName}`,
    specialization: s.specialization ?? null,
    rating: s.rating ? Number(s.rating) : null,
    avatarUrl: s.user.avatarUrl ?? null,
  }));

  return ok({ specialists: result });
}
