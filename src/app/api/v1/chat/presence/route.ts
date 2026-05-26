export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth-server';
import { setPresence } from '@/lib/redis-client';

function ok() { return NextResponse.json({ success: true }); }
function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const Schema = z.object({ activePage: z.string().max(200) });

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  await setPresence(userId, parsed.data.activePage);
  return ok();
}
