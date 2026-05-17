export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateUserUseCase } from '@/application/use-cases/admin';
import { CreateUserSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? '';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!ADMIN_ROLES.includes(role)) {
      return apiError('FORBIDDEN', 'Admin access required', 403);
    }

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));

    const registry = DIRegistry.instance;
    // Use repository directly — no ListUsersUseCase exists
    const users = await registry.userRepository.findMany({ page, limit });

    return ok(users);
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

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? '') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!ADMIN_ROLES.includes(role)) {
      return apiError('FORBIDDEN', 'Admin access required', 403);
    }

    const body: unknown = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new CreateUserUseCase(
      registry.userRepository,
      registry.passwordHasher,
      registry.auditLogRepository,
    );

    const result = await useCase.execute(parsed.data, userId, role);
    return ok(result, 201);
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
