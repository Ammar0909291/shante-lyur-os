export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const registry = DIRegistry.instance;
    const period = await registry.payrollRepository.findPeriodById(params.id);
    if (!period) return apiError('NOT_FOUND', 'Payroll period not found', 404);

    const [payouts, entries, adjustments] = await Promise.all([
      registry.payrollRepository.findPayoutsByPeriod(params.id),
      registry.payrollRepository.findEntriesByPeriod(params.id),
      registry.payrollRepository.findAdjustmentsByPeriod(params.id),
    ]);

    return ok({ period, payouts, entries, adjustments });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
