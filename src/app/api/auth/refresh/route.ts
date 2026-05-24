export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { prisma } from '@/infrastructure/config/prisma-client';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret-change-me';

function sha256(s: string) { return createHash('sha256').update(s).digest('hex'); }
function fail(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('refresh_token')?.value;
    const auth = req.headers.get('authorization');
    const bearerToken = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    let refreshToken: string | undefined = cookieToken ?? bearerToken;

    if (!refreshToken) {
      const body = await req.json().catch(() => null);
      if (body && typeof body?.refreshToken === 'string') refreshToken = body.refreshToken;
    }
    if (!refreshToken) return fail('VALIDATION_ERROR', 'Refresh token required', 400);

    let payload: { sub: string };
    try { payload = jwt.verify(refreshToken, REFRESH_SECRET) as { sub: string }; }
    catch { return fail('UNAUTHORIZED', 'Invalid token', 401); }

    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash: sha256(refreshToken), revokedAt: null } });
    if (!stored || stored.expiresAt < new Date()) return fail('UNAUTHORIZED', 'Token expired or revoked', 401);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return fail('UNAUTHORIZED', 'User not found', 401);

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role, type: 'access' }, ACCESS_SECRET, { expiresIn: '8h' });
    const newRefresh = jwt.sign({ sub: user.id, v: Date.now() }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: { id: crypto.randomUUID(), userId: user.id, tokenHash: sha256(newRefresh), expiresAt: new Date(Date.now() + 7 * 86400000) },
    });

    const res = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, status: user.status },
        accessToken,
      },
    });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('access_token', accessToken, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 28800 });
    res.cookies.set('refresh_token', newRefresh, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    res.cookies.set('user_role', user.role, { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 28800 });
    res.cookies.set('user_id', user.id, { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 28800 });
    return res;
  } catch (e) {
    return fail('INTERNAL_ERROR', e instanceof Error ? e.message : 'Unknown', 500);
  }
}
