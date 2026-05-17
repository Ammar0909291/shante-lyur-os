export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { RefreshTokenUseCase } from '@/application/use-cases/auth';
import { RefreshTokenSchema } from '@/application/dto';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
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
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function POST(req: NextRequest) {
  try {
    // Prefer cookie, fall back to Authorization header bearer, then body
    const cookieToken = req.cookies.get('refresh_token')?.value;
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    let refreshToken: string | undefined = cookieToken ?? bearerToken;

    if (!refreshToken) {
      const body: unknown = await req.json().catch(() => null);
      const parsed = RefreshTokenSchema.safeParse(body);
      if (parsed.success) {
        refreshToken = parsed.data.refreshToken;
      }
    }

    if (!refreshToken) {
      return apiError('VALIDATION_ERROR', 'Refresh token is required', 400);
    }

    const registry = DIRegistry.instance;
    const useCase = new RefreshTokenUseCase(
      registry.userRepository,
      registry.refreshTokenRepository,
      registry.passwordHasher,
      registry.tokenService,
    );

    const result = await useCase.execute({ refreshToken });

    const response = ok({
      accessToken: result.accessToken,
    });

    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
