export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string; first_name: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
  };
}

export async function POST(request: NextRequest) {
  // Validate secret token if configured
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const expectedSecret = process.env['TELEGRAM_WEBHOOK_SECRET'];
  if (expectedSecret && secretToken !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret token' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.info(`[Webhook:Telegram] Update ${update.update_id}`);

  if (update.message) {
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = msg.text ?? '';
    const from = msg.from;

    console.info(`[Webhook:Telegram] Message from chatId=${chatId} (@${from.username ?? from.first_name}): ${text}`);

    // Handle /start command — link the chatId to user account
    if (text.startsWith('/start')) {
      const token = text.replace('/start', '').trim();
      console.info(`[Webhook:Telegram] /start chatId=${chatId} token=${token || 'none'}`);
      // In production: verify token, link chatId to user's CommunicationPreference
    }

    // Handle /help
    if (text === '/help') {
      console.info(`[Webhook:Telegram] /help from chatId=${chatId}`);
    }
  }

  if (update.callback_query) {
    console.info(`[Webhook:Telegram] CallbackQuery from ${update.callback_query.from.id}: ${update.callback_query.data ?? ''}`);
  }

  // Always return 200 to Telegram (even on errors) to avoid re-delivery flood
  return NextResponse.json({ ok: true }, { status: 200 });
}
