export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetPayrollAnalyticsUseCase } from '@/application/use-cases/payroll';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET() {
  try {
    const registry = DIRegistry.instance;
    const useCase = new GetPayrollAnalyticsUseCase(registry.payrollRepository);
    const result = await useCase.execute();
    return ok(result);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
