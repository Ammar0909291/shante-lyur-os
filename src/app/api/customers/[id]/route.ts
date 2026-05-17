export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { UpdateCustomerProfileUseCase } from '@/application/use-cases/crm';
import { UpdateCustomerProfileSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const registry = DIRegistry.instance;

    const profile = await registry.customerProfileRepository.findById(id);
    if (!profile) {
      return apiError('NOT_FOUND', `CustomerProfile ${id} not found`, 404);
    }

    // Clients can only see their own profile
    if (role === UserRole.CLIENT && profile.userId !== userId) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const recentAppointments = await registry.appointmentRepository.findMany({
      clientId: profile.userId,
      limit: 10,
    });

    return ok({ profile, recentAppointments });
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = UpdateCustomerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new UpdateCustomerProfileUseCase(
      registry.customerProfileRepository,
      registry.auditLogRepository,
    );

    const result = await useCase.execute(id, parsed.data, userId, role);
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
