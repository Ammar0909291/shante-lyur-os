export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { TriggerFollowUpNotificationsUseCase } from '@/application/use-cases/notifications/trigger-follow-up-notifications.use-case';
import { DomainError } from '@/domain/errors';
import { UserRole } from '@/domain/enums';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      return apiError('FORBIDDEN', 'Admin role required', 403);
    }

    const body = await req.json().catch(() => ({}));
    const registry = DIRegistry.instance;
    const uc = new TriggerFollowUpNotificationsUseCase(
      registry.appointmentRepository,
      registry.userRepository,
      registry.notificationService,
    );
    const result = await uc.execute({
      daysSince: body.daysSince,
      limit: body.limit,
    });
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, 400);
    console.error('[POST /api/communications/schedulers/follow-up]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
