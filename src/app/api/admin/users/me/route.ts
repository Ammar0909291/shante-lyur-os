export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    // Fall back to first admin user for dev environments without auth
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    if (!admin) return NextResponse.json({ success: false }, { status: 401 });
    return ok(admin);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  return ok(user);
}
