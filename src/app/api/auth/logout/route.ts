export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { LogoutUseCase } from '@/application/use-cases/auth';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function clearAuthCookies(response: NextResponse): void {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set('access_token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  response.cookies.set('refresh_token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  response.cookies.set('user_role', '', { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
  response.cookies.set('user_id', '', { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    // userId may be null if middleware didn't set it (token already expired)
    // We still clear cookies regardless

    const refreshToken =
      req.cookies.get('refresh_token')?.value ??
      (await req.json().then((b: unknown) => {
        if (b && typeof b === 'object' && 'refreshToken' in b && typeof (b as Record<string, unknown>).refreshToken === 'string') {
          return (b as { refreshToken: string }).refreshToken;
        }
        return undefined;
      }).catch(() => undefined));

    if (userId) {
      const registry = DIRegistry.instance;
      const useCase = new LogoutUseCase(
        registry.sessionRepository,
        registry.refreshTokenRepository,
        registry.auditLogRepository,
      );

      const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
      await useCase.execute(
        userId,
        undefined, // sessionToken — not tracked separately in this flow
        refreshToken,
        ipAddress ?? undefined,
      );
    }

    const response = ok({ message: 'Logged out successfully' });
    clearAuthCookies(response);
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
