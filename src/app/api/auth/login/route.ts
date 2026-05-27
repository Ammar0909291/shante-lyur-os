export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { prisma } from '@/infrastructure/config/prisma-client';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret-change-me';

function sha256(s: string) { return createHash('sha256').update(s).digest('hex'); }
function fail(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid request', 400);

    const { email, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail('UNAUTHORIZED', 'Invalid credentials', 401);

    // Fetch per-user permission overrides (granted by SUPER_ADMIN)
    const overrides = await prisma.userPermissionOverride.findMany({
      where: { userId: user.id },
      select: { resource: true },
    });
    const grants = overrides.map((o) => o.resource);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return fail('LOCKED', `Account locked until ${user.lockedUntil.toISOString()}`, 403);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
      const { ipAddress, userAgent } = getRequestMeta(req);
      void logAudit({
        userId: user.id,
        role: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent,
        metadata: { email: user.email },
      });
      return fail('UNAUTHORIZED', 'Invalid credentials', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, type: 'access', grants },
      ACCESS_SECRET,
      { expiresIn: '8h' },
    );
    const refreshStr = jwt.sign(
      { sub: user.id, v: Date.now() },
      REFRESH_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' },
    );

    await prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: sha256(refreshStr),
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 86400000),
      },
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
    res.cookies.set('refresh_token', refreshStr, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: (rememberMe ? 30 : 7) * 86400 });
    res.cookies.set('user_role', user.role, { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 28800 });
    res.cookies.set('user_id', user.id, { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 28800 });

    const { ipAddress, userAgent } = getRequestMeta(req);
    void logAudit({
      userId: user.id,
      role: user.role,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: { email: user.email, rememberMe },
    });

    return res;
  } catch (e) {
    return fail('INTERNAL_ERROR', e instanceof Error ? e.message : 'Unknown error', 500);
  }
}
