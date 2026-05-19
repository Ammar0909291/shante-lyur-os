export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreatePaymentUseCase } from '@/application/use-cases/payment';
import { CreatePaymentSchema } from '@/application/dto';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body: unknown = await req.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new CreatePaymentUseCase(
      registry.paymentRepository,
      registry.appointmentRepository,
      registry.yooKassaGateway,
      registry.robokassaGateway,
      registry.eventBus,
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
