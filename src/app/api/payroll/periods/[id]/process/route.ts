export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ProcessPayrollPeriodUseCase } from '@/application/use-cases/payroll';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const registry = DIRegistry.instance;
    const useCase = new ProcessPayrollPeriodUseCase(
      registry.payrollRepository,
      registry.specialistRepository,
    );
    const result = await useCase.execute(params.id);
    return ok(result);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
