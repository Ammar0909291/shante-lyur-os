export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
    const page  = Math.max(1, parseInt(params.get('page') ?? '1', 10));

    const registry = DIRegistry.instance;
    const result = await registry.locationRepository.findMany({ isActive: true, page, limit });

    const items = result.items.map(l => ({
      id: l.id,
      name: l.name,
      address: l.address,
      city: l.city,
      isActive: l.isActive,
    }));

    return ok({ items, total: result.total, page, limit });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
