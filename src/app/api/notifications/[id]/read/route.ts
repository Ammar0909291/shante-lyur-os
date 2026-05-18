export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { MarkNotificationReadUseCase } from '@/application/use-cases/notifications/mark-notification-read.use-case';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const registry = DIRegistry.instance;
    const uc = new MarkNotificationReadUseCase(registry.notificationRepository);
    await uc.execute(params.id, userId);
    return ok({ id: params.id });
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, err.code === 'NOT_FOUND' ? 404 : 400);
    console.error('[PATCH /api/notifications/[id]/read]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
