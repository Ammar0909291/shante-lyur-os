export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { BroadcastMessageUseCase } from '@/application/use-cases/notifications/broadcast-message.use-case';
import { DomainError } from '@/domain/errors';
import { UserRole } from '@/domain/enums';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';
import { z } from 'zod';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const BroadcastSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  targetRole: z.nativeEnum(UserRole).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN && role !== UserRole.OPERATOR) {
      return apiError('FORBIDDEN', 'Operator or Admin role required', 403);
    }

    const body = await req.json();
    const parsed = BroadcastSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.message, 400);

    const registry = DIRegistry.instance;
    const uc = new BroadcastMessageUseCase(registry.notificationRepository, registry.userRepository);
    const result = await uc.execute({ ...parsed.data, senderId: userId });
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, 400);
    console.error('[POST /api/communications/broadcast]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
