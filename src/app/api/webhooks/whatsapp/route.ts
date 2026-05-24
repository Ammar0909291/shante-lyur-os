export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

interface WhatsAppWebhookEntry {
  changes: Array<{
    value: {
      messages?: Array<{
        id: string; from: string; type: string;
        text?: { body: string };
        timestamp: string;
      }>;
      statuses?: Array<{
        id: string; status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        errors?: Array<{ code: number; title: string }>;
      }>;
    };
  }>;
}

interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

// GET — Meta webhook verification challenge
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  const verifyToken = process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'];

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.info('[Webhook:WhatsApp] Verification success');
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  console.warn('[Webhook:WhatsApp] Verification failed', { mode, token });
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — incoming messages and delivery status updates
export async function POST(request: NextRequest) {
  let body: WhatsAppWebhookBody;
  try {
    body = await request.json() as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change.value;

      // Process inbound messages
      if (val.messages) {
        for (const msg of val.messages) {
          console.info(`[Webhook:WhatsApp] Inbound from ${msg.from}: ${msg.text?.body ?? '[non-text]'}`);
          // TODO: Route inbound messages to internal chat or CRM
        }
      }

      // Process delivery status updates
      if (val.statuses) {
        for (const status of val.statuses) {
          const dbStatus = {
            sent: 'SENT',
            delivered: 'DELIVERED',
            read: 'READ',
            failed: 'FAILED',
          }[status.status] as string | undefined;

          if (!dbStatus) continue;

          try {
            await prisma.outboundMessage.updateMany({
              where: { externalId: status.id, channel: 'WHATSAPP' },
              data: {
                status: dbStatus as never,
                ...(status.status === 'delivered' ? { deliveredAt: new Date() } : {}),
                ...(status.status === 'read'      ? { readAt: new Date() }      : {}),
                ...(status.status === 'failed'    ? { failedAt: new Date(), errorMessage: status.errors?.[0]?.title } : {}),
              },
            });
          } catch (err) {
            console.error('[Webhook:WhatsApp] Status update error', err);
          }

          console.info(`[Webhook:WhatsApp] Delivery status update: msgId=${status.id} → ${status.status}`);
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
