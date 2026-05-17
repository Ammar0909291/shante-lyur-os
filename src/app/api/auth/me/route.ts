export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetMeUseCase } from '@/application/use-cases/auth';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const registry = DIRegistry.instance;
    const useCase = new GetMeUseCase(
      registry.userRepository,
      registry.customerProfileRepository,
    );

    const result = await useCase.execute(userId);

    return ok({
      user: {
        id: result.user.id,
        email: result.user.email.value,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        status: result.user.status,
        emailVerified: result.user.emailVerified,
        phoneVerified: result.user.phoneVerified,
        createdAt: result.user.createdAt,
      },
      profile: result.profile ?? null,
    });
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
