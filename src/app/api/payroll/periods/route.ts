export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreatePayrollPeriodUseCase } from '@/application/use-cases/payroll';
import { CreatePayrollPeriodSchema } from '@/application/dto';
import { PayrollPeriodStatus } from '@/domain/enums';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as PayrollPeriodStatus | null;
    const limit = Number(searchParams.get('limit') ?? '20');
    const offset = Number(searchParams.get('offset') ?? '0');

    const registry = DIRegistry.instance;
    const result = await registry.payrollRepository.findPeriods({ status: status ?? undefined, limit, offset });
    return ok(result);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json();
    const parsed = CreatePayrollPeriodSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });

    const registry = DIRegistry.instance;
    const useCase = new CreatePayrollPeriodUseCase(registry.payrollRepository);
    const period = await useCase.execute(parsed.data, userId);
    return ok(period);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
