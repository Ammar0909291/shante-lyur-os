export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/infrastructure/config/prisma-client';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { jwtVerify } from 'jose';

function sha256(s: string) { return createHash('sha256').update(s).digest('hex'); }

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Resolve userId from access token for audit log (best-effort)
  let auditUserId: string | null = null;
  let auditRole: string | null = null;
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (accessToken) {
      const secret = new TextEncoder().encode(ACCESS_SECRET);
      const { payload } = await jwtVerify(accessToken, secret);
      auditUserId = (payload.sub as string) ?? null;
      auditRole = (payload.role as string) ?? null;
    }
  } catch { /* best-effort */ }

  if (refreshToken) {
    try {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch { /* ignore — still clear cookies */ }
  }

  if (auditUserId) {
    const { ipAddress, userAgent } = getRequestMeta(req);
    void logAudit({
      userId: auditUserId,
      role: auditRole,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: auditUserId,
      ipAddress,
      userAgent,
    });
  }

  const res = NextResponse.json({ success: true, data: { message: 'Logged out' } });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('access_token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set('user_role', '', { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set('user_id', '', { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
