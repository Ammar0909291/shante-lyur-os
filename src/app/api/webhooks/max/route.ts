export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';

interface MaxUpdate {
  update_type: string;
  timestamp: number;
  message?: {
    sender: { user_id: number; name: string };
    recipient: { chat_id: number };
    body: { mid: string; text?: string };
  };
  message_created?: {
    timestamp: number;
    message: {
      sender: { user_id: number };
      body: { mid: string; text?: string };
    };
  };
}

export async function POST(request: NextRequest) {
  let update: MaxUpdate;
  try {
    update = await request.json() as MaxUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.info(`[Webhook:MAX] Update type=${update.update_type}`);

  if (update.update_type === 'message_created' && update.message_created) {
    const msg = update.message_created.message;
    const userId = String(msg.sender.user_id);
    const text = msg.body.text ?? '';
    console.info(`[Webhook:MAX] Message from userId=${userId}: ${text}`);
    // Route to internal messaging or CRM
  }

  if (update.message) {
    const { sender, body } = update.message;
    console.info(`[Webhook:MAX] Message from ${sender.name} (${sender.user_id}): ${body.text ?? '[media]'}`);
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
