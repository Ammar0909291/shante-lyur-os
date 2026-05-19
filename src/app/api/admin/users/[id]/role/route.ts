export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ChangeUserRoleUseCase } from '@/application/use-cases/admin';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import { z } from 'zod';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

const ChangeRoleBodySchema = z.object({
  newRole: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'SPECIALIST', 'CLIENT']),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? '') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!ADMIN_ROLES.includes(role)) {
      return apiError('FORBIDDEN', 'Admin access required', 403);
    }

    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = ChangeRoleBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new ChangeUserRoleUseCase(
      registry.userRepository,
      registry.auditLogRepository,
      registry.eventBus,
    );

    const result = await useCase.execute(
      { userId: id, newRole: parsed.data.newRole },
      userId,
      role,
    );
    return ok(result);
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
