export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { UpdateInventoryItemSchema } from '@/application/dto';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const registry = DIRegistry.instance;
    const item = await registry.inventoryItemRepository.findById(params.id);
    if (!item) return apiError('NOT_FOUND', 'Inventory item not found', 404);
    return ok(item);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json();
    const parsed = UpdateInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const existing = await registry.inventoryItemRepository.findById(params.id);
    if (!existing) return apiError('NOT_FOUND', 'Inventory item not found', 404);

    const updated = await registry.inventoryItemRepository.update(params.id, parsed.data);
    return ok(updated);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
