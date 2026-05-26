export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function POST(req: NextRequest) {
  let body: { phone?: string };
  try { body = await req.json(); } catch { return err('Invalid JSON'); }

  const phone = (body.phone ?? '').replace(/\s/g, '');
  if (!phone) return err('phone is required');

  const client = await prisma.user.findFirst({
    where: { phone, role: 'CLIENT', status: 'ACTIVE' },
    select: { firstName: true, lastName: true },
  });

  if (!client) {
    return NextResponse.json({
      success: true,
      data: { found: false },
    });
  }

  return ok({
    found: true,
    firstName: client.firstName,
    lastName:  client.lastName,
  });
}
