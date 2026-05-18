export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListClientPackagesUseCase } from '@/application/use-cases/package';
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

    const activeOnly = req.nextUrl.searchParams.get('active') === 'true';
    const registry = DIRegistry.instance;
    const useCase = new ListClientPackagesUseCase(registry.clientPackageRepository);
    const packages = await useCase.execute(params.profileId, activeOnly);

    return ok({
      packages: packages.map(p => ({
        id: p.id,
        name: p.name,
        serviceId: p.serviceId,
        totalSessions: p.totalSessions,
        usedSessions: p.usedSessions,
        remainingSessions: p.remainingSessions,
        priceTotal: p.priceTotal,
        purchasedAt: p.purchasedAt,
        expiresAt: p.expiresAt,
        status: p.status,
        notes: p.notes,
      })),
    });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
