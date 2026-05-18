export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { SetServiceConsumablesUseCase } from '@/application/use-cases/inventory';
import { SetServiceConsumablesSchema } from '@/application/dto';

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
    const serviceId = searchParams.get('serviceId');
    if (!serviceId) return apiError('VALIDATION_ERROR', 'serviceId is required', 400);

    const registry = DIRegistry.instance;
    const consumables = await registry.serviceConsumableRepository.findByService(serviceId);
    return ok(consumables);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json();
    const parsed = SetServiceConsumablesSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const useCase = new SetServiceConsumablesUseCase(
      registry.inventoryItemRepository,
      registry.serviceConsumableRepository,
    );
    const result = await useCase.execute(parsed.data);
    return ok(result);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
