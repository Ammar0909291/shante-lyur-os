export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { prisma } = await import('@/infrastructure/config/prisma-client');
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, name: true, address: true, city: true },
    });
    return NextResponse.json({ success: true, data: { items: locations } });
  } catch {
    return NextResponse.json({
      success: true,
      data: { items: [] },
    });
  }
}
