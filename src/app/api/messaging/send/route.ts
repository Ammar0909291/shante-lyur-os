export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { getMessagingService } from '@/lib/communication/messaging-service';
import type { ProviderChannel, TemplateVariables } from '@/lib/communication/types';

interface SendBody {
  userId: string;
  channel: ProviderChannel;
  templateKey: string;
  vars: TemplateVariables;
  appointmentId?: string;
  lang?: 'ru' | 'en';
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }

  let body: SendBody;
  try { body = await request.json() as SendBody; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  const { userId, channel, templateKey, vars, appointmentId, lang } = body;
  if (!userId || !channel || !templateKey) {
    return apiError('BAD_REQUEST', 'userId, channel and templateKey are required', 400);
  }

  const VALID_CHANNELS: ProviderChannel[] = ['whatsapp', 'telegram', 'max', 'email'];
  if (!VALID_CHANNELS.includes(channel)) {
    return apiError('BAD_REQUEST', `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}`, 400);
  }

  try {
    const svc = getMessagingService();
    const { messageId, result } = await svc.sendToUser({
      userId, channel, templateKey, vars: vars ?? {}, appointmentId, lang,
    });

    console.info(`[API:messaging/send] channel=${channel} user=${userId} template=${templateKey} success=${result.success}`);
    return ok({ messageId, delivered: result.success, externalId: result.externalId, error: result.error });
  } catch (err) {
    console.error('[API:messaging/send] Error', err);
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Send failed', 500);
  }
}
