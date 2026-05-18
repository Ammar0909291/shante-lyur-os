export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetCommunicationHistoryUseCase } from '@/application/use-cases/notifications/get-communication-history.use-case';
import { DomainError } from '@/domain/errors';
import { UserRole } from '@/domain/enums';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const isOwnHistory = actorId === params.userId;
    const isOperator = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.OPERATOR;
    if (!isOwnHistory && !isOperator) {
      return apiError('FORBIDDEN', 'Access denied', 403);
    }

    const sp = req.nextUrl.searchParams;
    const registry = DIRegistry.instance;
    const uc = new GetCommunicationHistoryUseCase(registry.notificationRepository, registry.userRepository);
    const result = await uc.execute(params.userId, {
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    });
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, err.code === 'NOT_FOUND' ? 404 : 400);
    console.error('[GET /api/communications/history]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
