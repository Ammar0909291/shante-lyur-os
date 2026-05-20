export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { prisma } from '@/infrastructure/config/prisma-client';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
});

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret-change-me';

function sha256(s: string) { return createHash('sha256').update(s).digest('hex'); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { issues: parsed.error.issues } } }, { status: 400 });
    }

    const { email, password, firstName, lastName, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered' } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone ?? null,
        role: 'CLIENT',
        status: 'ACTIVE',
        emailVerified: false,
        phoneVerified: false,
        failedLogins: 0,
      },
    });

    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, ACCESS_SECRET, { expiresIn: '8h' });
    const refreshStr = jwt.sign({ sub: user.id, v: Date.now() }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: { id: crypto.randomUUID(), userId: user.id, tokenHash: sha256(refreshStr), expiresAt: new Date(Date.now() + 7 * 86400000) },
    });

    const res = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, status: user.status },
        accessToken,
      },
    }, { status: 201 });
    res.cookies.set('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 28800 });
    res.cookies.set('refresh_token', refreshStr, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'Unknown' } }, { status: 500 });
  }
}
