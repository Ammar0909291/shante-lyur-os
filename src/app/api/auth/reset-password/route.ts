export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/infrastructure/config/prisma-client';

const Schema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

const SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return apiError('Invalid request', 400);

    const { token, newPassword } = parsed.data;

    let payload: { sub?: string; type?: string };
    try {
      payload = jwt.verify(token, SECRET) as { sub?: string; type?: string };
    } catch {
      return apiError('Reset link is invalid or expired', 400);
    }

    if (payload.type !== 'password-reset' || !payload.sub) {
      return apiError('Invalid reset token', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return apiError('User not found', 404);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, failedLogins: 0, lockedUntil: null },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return ok({ message: 'Password reset successfully. Please log in.' });
  } catch {
    return apiError('Internal error', 500);
  }
}
