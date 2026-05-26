export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

export async function GET() {
  const row = await (prisma as any).systemConfig.findUnique({
    where: { key: 'online_booking_enabled' },
    select: { value: true },
  }) as { value: string } | null;

  // Default to enabled if the key has never been set
  const enabled = row ? row.value === 'true' : true;

  return NextResponse.json({ success: true, data: { enabled } });
}
