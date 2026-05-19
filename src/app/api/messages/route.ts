export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { MessageVisibility, UserRole } from '@/domain/enums';
import { z } from 'zod';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const CreateMessageSchema = z.object({
  content:       z.string().min(1).max(2000).trim(),
  recipientId:   z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  profileId:     z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role   = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (role === UserRole.CLIENT) return apiError('FORBIDDEN', 'Insufficient permissions', 403);

    const params = req.nextUrl.searchParams;
    const limit        = Math.min(parseInt(params.get('limit') ?? '50', 10), 100);
    const offset       = parseInt(params.get('offset') ?? '0', 10);
    const appointmentId = params.get('appointmentId') ?? undefined;
    const profileId    = params.get('profileId') ?? undefined;
    const visParam     = params.get('visibility');
    const visibility   = visParam === 'BROADCAST' ? MessageVisibility.BROADCAST
                       : visParam === 'DIRECT'    ? MessageVisibility.DIRECT
                       : undefined;

    const registry = DIRegistry.instance;
    const result = await registry.internalMessageRepository.findForUser(userId, {
      appointmentId,
      profileId,
      visibility,
      limit,
      offset,
    });

    const unread = await registry.internalMessageRepository.countUnread(userId);

    return ok({ ...result, unread });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role   = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (role === UserRole.CLIENT) return apiError('FORBIDDEN', 'Insufficient permissions', 403);

    const body: unknown = await req.json();
    const parsed = CreateMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { issues: parsed.error.issues } } },
        { status: 400 }
      );
    }

    const { content, recipientId, appointmentId, profileId } = parsed.data;
    const visibility = recipientId ? MessageVisibility.DIRECT : MessageVisibility.BROADCAST;

    const registry = DIRegistry.instance;
    const message = await registry.internalMessageRepository.create({
      senderId: userId,
      recipientId,
      content,
      appointmentId,
      profileId,
      visibility,
    });

    // Broadcast to relevant SSE channels
    if (recipientId) {
      registry.realtimeService.broadcast(`user:${recipientId}`, 'chat', { messageId: message.id, senderId: userId });
    } else {
      registry.realtimeService.broadcast('messages', 'chat', { messageId: message.id, senderId: userId });
    }

    return ok(message, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
