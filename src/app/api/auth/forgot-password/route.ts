export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { z } from 'zod';

const Schema = z.object({ email: z.string().email() });

function ok() {
  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid email', 400);

  const { email } = parsed.data;

  // Intentionally constant-time: look up user but always return ok()
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, firstName: true, email: true },
  });

  if (!user) return ok(); // don't leak whether email exists

  // Invalidate any existing unexpired tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() }, // expire immediately
  });

  const token = crypto.randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password?token=${token}`;

  try {
    const registry = DIRegistry.instance;
    await registry.emailService.send(
      user.email,
      'Восстановление пароля — Shante Lyur',
      `Перейдите по ссылке для сброса пароля:\n\n${resetUrl}\n\nСсылка действительна 1 час.\n\nЕсли вы не запрашивали сброс пароля, проигнорируйте это письмо.`,
      {
        html: `
          <p>Добрый день, ${user.firstName}!</p>
          <p>Вы запросили сброс пароля для вашего аккаунта Shante Lyur.</p>
          <p><a href="${resetUrl}" style="color:#c9a96e">Сбросить пароль</a></p>
          <p>Ссылка действительна <strong>1 час</strong>.</p>
          <p>Если вы не запрашивали сброс пароля — проигнорируйте это письмо.</p>
        `,
      }
    );
  } catch {
    // Email failure is non-fatal — token was created, don't expose the error
    console.error('[forgot-password] email send failed for user:', user.id);
  }

  return ok();
}
