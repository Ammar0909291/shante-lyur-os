export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { LoginUseCase } from '@/application/use-cases/auth';
import { LoginSchema } from '@/application/dto';
import { DomainError } from '@/domain/errors';
import { rateLimitCheck } from '@/shared/api/rate-limit';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...( details ? { details } : {}) } }, { status });
}

function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
): void {
  const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: refreshMaxAge,
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const rl = await rateLimitCheck(`login:${ip}`, 5, 15 * 60);
    if (!rl.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many login attempts. Try again later.', 429);
    }

    const body: unknown = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new LoginUseCase(
      registry.userRepository,
      registry.refreshTokenRepository,
      registry.passwordHasher,
      registry.tokenService,
      registry.auditLogRepository,
    );

    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;
    const result = await useCase.execute(parsed.data, ipAddress ?? undefined, userAgent ?? undefined);

    const response = ok({
      user: {
        id: result.user.id,
        email: result.user.email.value,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        status: result.user.status,
      },
      accessToken: result.accessToken,
    });

    setAuthCookies(response, result.accessToken, result.refreshToken, parsed.data.rememberMe);
    return response;
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
