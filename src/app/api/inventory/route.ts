export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateInventoryItemUseCase, GetStockStatusUseCase } from '@/application/use-cases/inventory';
import { CreateInventoryItemSchema } from '@/application/dto';
import { InventoryCategory } from '@/domain/enums';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as InventoryCategory | null;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

    const registry = DIRegistry.instance;
    const useCase = new GetStockStatusUseCase(registry.inventoryItemRepository);
    const result = await useCase.execute({ category: category ?? undefined, lowStockOnly });
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
    const parsed = CreateInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const useCase = new CreateInventoryItemUseCase(
      registry.inventoryItemRepository,
      registry.supplierRepository,
    );
    const item = await useCase.execute(parsed.data);
    return ok(item);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
