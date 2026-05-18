export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetStockStatusUseCase } from '@/application/use-cases/inventory';
import { InventoryCategory } from '@/domain/enums';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(_req: NextRequest) {
  try {
    const registry = DIRegistry.instance;
    const useCase = new GetStockStatusUseCase(registry.inventoryItemRepository);

    const [all, consumables, retail, equipment] = await Promise.all([
      useCase.execute(),
      useCase.execute({ category: InventoryCategory.CONSUMABLE }),
      useCase.execute({ category: InventoryCategory.RETAIL }),
      useCase.execute({ category: InventoryCategory.EQUIPMENT }),
    ]);

    return ok({
      overall: all.summary,
      byCategory: {
        consumable: consumables.summary,
        retail: retail.summary,
        equipment: equipment.summary,
      },
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
