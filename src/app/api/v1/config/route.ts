export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_KEYS = [
  'telegram_bot_token',
  'whatsapp_access_token',
  'whatsapp_phone_id',
  'max_bot_token',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'smtp_from',
  'online_booking_enabled',
];

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) return err('Forbidden', 403);

  const rows = await (prisma as any).systemConfig.findMany({
    where: { key: { in: ALLOWED_KEYS } },
  });

  const config: Record<string, string> = {};
  for (const row of rows) config[row.key] = row.value;

  // Mask secrets — replace all chars except last 4 with *
  const masked: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    const val = config[key] ?? '';
    if (!val) { masked[key] = ''; continue; }
    const isSecret = key.includes('token') || key.includes('pass');
    masked[key] = isSecret && val.length > 4
      ? '*'.repeat(val.length - 4) + val.slice(-4)
      : val;
  }

  return ok(masked);
}

export async function PATCH(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) return err('Forbidden', 403);

  const body = await req.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    if (typeof value !== 'string') continue;
    // Skip if value is masked (unchanged)
    if (value.startsWith('***') || value === '') {
      if (value === '') {
        await (prisma as any).systemConfig.deleteMany({ where: { key } });
      }
      continue;
    }
    await (prisma as any).systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return ok({ saved: true });
}
