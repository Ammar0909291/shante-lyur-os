export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { RegisterUseCase } from '@/application/use-cases/auth';
import { RegisterUserSchema } from '@/application/dto';
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
): void {
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
    maxAge: 7 * 24 * 60 * 60,
  });
}

// Minimal no-op event bus for use-cases that require IEventBus
const noopEventBus = {
  async publish() { /* no-op */ },
  subscribe() { /* no-op */ },
};

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const rl = await rateLimitCheck(`register:${ip}`, 3, 60 * 60);
    if (!rl.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many registration attempts. Try again later.', 429);
    }

    const body: unknown = await req.json();
    const parsed = RegisterUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new RegisterUseCase(
      registry.userRepository,
      registry.refreshTokenRepository,
      registry.passwordHasher,
      registry.tokenService,
      registry.emailService,
      noopEventBus,
    );

    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const result = await useCase.execute(parsed.data, ipAddress ?? undefined);

    const response = ok(
      {
        user: {
          id: result.user.id,
          email: result.user.email.value,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          status: result.user.status,
        },
        accessToken: result.accessToken,
      },
      201,
    );

    setAuthCookies(response, result.accessToken, result.refreshToken);
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
