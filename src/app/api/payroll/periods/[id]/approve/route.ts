export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ApprovePayrollPeriodUseCase } from '@/application/use-cases/payroll';
import { ApprovePayrollPeriodSchema } from '@/application/dto';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json().catch(() => ({}));
    const parsed = ApprovePayrollPeriodSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });

    const registry = DIRegistry.instance;
    const useCase = new ApprovePayrollPeriodUseCase(registry.payrollRepository);
    await useCase.execute(params.id, userId, parsed.data.notes);
    return ok({ approved: true });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
