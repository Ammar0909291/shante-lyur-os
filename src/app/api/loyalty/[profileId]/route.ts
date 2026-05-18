export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetLoyaltyProfileUseCase } from '@/application/use-cases/loyalty';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const registry = DIRegistry.instance;
    const useCase = new GetLoyaltyProfileUseCase(
      registry.loyaltyRepository,
      registry.customerProfileRepository,
    );

    const result = await useCase.execute(params.profileId);
    return ok(result);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
