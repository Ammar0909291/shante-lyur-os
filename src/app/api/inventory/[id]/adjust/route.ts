export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { AdjustStockUseCase } from '@/application/use-cases/inventory';
import { AdjustStockSchema } from '@/application/dto';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json();
    const parsed = AdjustStockSchema.safeParse({ ...body, itemId: params.id });
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const useCase = new AdjustStockUseCase(registry.inventoryItemRepository);
    const result = await useCase.execute({ ...parsed.data, performedBy: parsed.data.performedBy ?? userId });
    return ok(result);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
