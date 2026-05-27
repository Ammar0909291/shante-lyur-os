export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return err('Forbidden', 403);

  let body: { chatId?: string };
  try { body = await req.json() as { chatId?: string }; }
  catch { return err('Invalid JSON'); }

  const chatId = body.chatId?.trim();
  if (!chatId) return err('chatId is required');

  // Resolve bot token — env var takes priority, then DB
  let botToken = process.env['TELEGRAM_BOT_TOKEN'] ?? '';
  if (!botToken) {
    try {
      const row = await (prisma as unknown as { systemConfig: { findUnique: (args: unknown) => Promise<{ value: string } | null> } })
        .systemConfig.findUnique({ where: { key: 'telegram_bot_token' }, select: { value: true } });
      if (row?.value) botToken = row.value;
    } catch {}
  }

  if (!botToken) {
    return err('Telegram Bot Token не настроен. Сохраните токен в разделе Настройки → Коммуникации.', 422);
  }

  const salonName = process.env['SALON_NAME'] ?? 'Shante Lyur';
  const text = `✅ <b>${salonName}</b>\n\nТестовое сообщение отправлено успешно!\nTelegram-интеграция работает корректно.`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const json = await res.json() as { ok: boolean; description?: string; error_code?: number };

    if (!json.ok) {
      const msg = json.description ?? `Telegram API error ${json.error_code ?? ''}`;
      return err(msg, 422);
    }

    return ok({ message: `Сообщение отправлено в chat_id ${chatId}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return err(msg, 502);
  }
}
