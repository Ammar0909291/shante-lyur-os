export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DIRegistry } from '@/infrastructure/config/di-registry';

const Schema = z.object({ email: z.string().email() });

const SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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
    if (!parsed.success) return apiError('Invalid email', 400);

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return 200 to prevent email enumeration
    if (!user) return ok({ message: 'If that email exists, a reset link was sent.' });

    const token = jwt.sign(
      { sub: user.id, type: 'password-reset', jti: crypto.randomUUID() },
      SECRET,
      { expiresIn: '1h' }
    );

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    try {
      const registry = DIRegistry.instance;
      await registry.emailService.sendTemplate(email, 'password-reset', {
        name: user.firstName,
        link: resetUrl,
      });
    } catch {
      // Email sending failed; log in production
    }

    return ok({ message: 'If that email exists, a reset link was sent.' });
  } catch {
    return apiError('Internal error', 500);
  }
}
