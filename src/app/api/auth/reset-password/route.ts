export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { z } from 'zod';

const Schema = z.object({
  token: z.string().uuid(),
  newPassword: z.string()
    .min(8, 'Пароль должен быть не менее 8 символов')
    .max(128, 'Пароль слишком длинный'),
});

function ok() {
  return NextResponse.json({ success: true });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request';
    return apiError('VALIDATION_ERROR', msg, 400);
  }

  const { token, newPassword } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  });

  if (!resetToken) return apiError('INVALID_TOKEN', 'Ссылка недействительна или устарела', 400);
  if (resetToken.usedAt) return apiError('TOKEN_USED', 'Ссылка уже была использована', 400);
  if (resetToken.expiresAt < new Date()) return apiError('TOKEN_EXPIRED', 'Срок действия ссылки истёк', 400);

  const registry = DIRegistry.instance;
  const passwordHash = await registry.passwordHasher.hash(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, failedLogins: 0 },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Revoke all existing refresh tokens so old sessions can't be reused
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return ok();
}
