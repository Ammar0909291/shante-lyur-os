export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { GetNotificationsUseCase } from '@/application/use-cases/notifications/get-notifications.use-case';
import { DomainError } from '@/domain/errors';
import { NotificationStatus, NotificationType } from '@/domain/enums';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const sp = req.nextUrl.searchParams;
    const registry = DIRegistry.instance;
    const uc = new GetNotificationsUseCase(registry.notificationRepository);

    const result = await uc.execute(userId, {
      status: sp.get('status') as NotificationStatus | undefined,
      type: sp.get('type') as NotificationType | undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    });

    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, 400);
    console.error('[GET /api/notifications]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
