export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { UserRole } from '@/domain/enums';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role   = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (role === UserRole.CLIENT) return apiError('FORBIDDEN', 'Insufficient permissions', 403);

    const { id } = await context.params;
    const registry = DIRegistry.instance;
    await registry.internalMessageRepository.markRead(id, userId);
    return ok({ marked: true });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
