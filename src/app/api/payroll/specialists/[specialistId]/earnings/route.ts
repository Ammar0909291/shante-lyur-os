export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetSpecialistEarningsUseCase } from '@/application/use-cases/payroll';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest, { params }: { params: { specialistId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const limit = Number(searchParams.get('limit') ?? '50');
    const offset = Number(searchParams.get('offset') ?? '0');

    const registry = DIRegistry.instance;
    const useCase = new GetSpecialistEarningsUseCase(
      registry.payrollRepository,
      registry.specialistRepository,
    );
    const result = await useCase.execute(params.specialistId, { from, to, limit, offset });
    return ok(result);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
