export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListMovementsUseCase } from '@/application/use-cases/inventory';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') ?? '50');
    const offset = Number(searchParams.get('offset') ?? '0');

    const registry = DIRegistry.instance;
    const useCase = new ListMovementsUseCase(
      registry.inventoryItemRepository,
      registry.inventoryMovementRepository,
    );
    const result = await useCase.execute(params.id, { limit, offset });
    return ok(result);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
