export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetRetentionAnalyticsUseCase } from '@/application/use-cases/crm';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (role === UserRole.CLIENT) return apiError('FORBIDDEN', 'Insufficient permissions', 403);

    const registry = DIRegistry.instance;
    const useCase = new GetRetentionAnalyticsUseCase(
      registry.customerProfileRepository,
      registry.clientMembershipRepository,
      registry.clientPackageRepository,
    );

    const analytics = await useCase.execute();
    return ok(analytics);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
