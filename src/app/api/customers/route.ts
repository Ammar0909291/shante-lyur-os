export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListCustomersUseCase, CreateCustomerProfileUseCase } from '@/application/use-cases/crm';
import { ListCustomersSchema, CreateCustomerProfileSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Only staff can list all customers
    if (role === UserRole.CLIENT) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => { raw[key] = value; });

    const parsed = ListCustomersSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new ListCustomersUseCase(registry.customerProfileRepository);
    const result = await useCase.execute(parsed.data);

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

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body: unknown = await req.json();
    const parsed = CreateCustomerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new CreateCustomerProfileUseCase(
      registry.customerProfileRepository,
      registry.userRepository,
      registry.auditLogRepository,
    );

    const result = await useCase.execute(parsed.data, userId);
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
