export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AxiosError } from 'axios';
import { prisma } from '@/infrastructure/config/prisma-client';
import { tgGet, tgPost } from '@/lib/communication/providers/telegram-http';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

function networkErrMessage(e: AxiosError): string {
  const proxy =
    process.env['HTTPS_PROXY'] ?? process.env['https_proxy'] ??
    process.env['HTTP_PROXY']  ?? process.env['http_proxy'];

  const proxyHint = proxy
    ? ` (прокси: ${proxy})`
    : ' — попробуйте задать переменную HTTPS_PROXY в файле .env.local';

  return `Не удалось подключиться к api.telegram.org${proxyHint}. Код: ${e.code ?? e.message}`;
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
      const row = await (prisma as unknown as {
        systemConfig: { findUnique: (args: unknown) => Promise<{ value: string } | null> };
      }).systemConfig.findUnique({ where: { key: 'telegram_bot_token' }, select: { value: true } });
      if (row?.value) botToken = row.value;
    } catch {}
  }

  if (!botToken) {
    return err(
      'Telegram Bot Token не настроен. Сохраните токен в разделе Коммуникации → Настройки.',
      422,
    );
  }

  // Step 1: verify token is valid via getMe
  try {
    const me = await tgGet(botToken, 'getMe');
    if (!me.ok) {
      return err(
        `Токен недействителен: ${me.description ?? 'Telegram отклонил запрос'}`,
        422,
      );
    }
  } catch (e) {
    const axErr = e as AxiosError;
    if (axErr.response) {
      const data = axErr.response.data as { description?: string } | undefined;
      return err(`Ошибка проверки токена: ${data?.description ?? `HTTP ${axErr.response.status}`}`, 422);
    }
    return err(networkErrMessage(axErr), 502);
  }

  // Step 2: send test message
  const salonName = process.env['SALON_NAME'] ?? 'Shante Lyur';
  const text = `✅ <b>${salonName}</b>\n\nТестовое сообщение отправлено успешно!\nTelegram-интеграция работает корректно.`;

  try {
    const sent = await tgPost(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    if (!sent.ok) {
      const desc = sent.description ?? `error_code=${sent.error_code}`;
      // chat not found / bot not started
      if (sent.error_code === 400 || sent.error_code === 403) {
        return err(
          `Бот не может отправить сообщение. Убедитесь, что вы написали боту /start. Ошибка: ${desc}`,
          422,
        );
      }
      return err(desc, 422);
    }

    return ok({ message: `✅ Сообщение отправлено в chat_id ${chatId}` });
  } catch (e) {
    const axErr = e as AxiosError;
    if (axErr.response) {
      const data = axErr.response.data as { description?: string; error_code?: number } | undefined;
      if (axErr.response.status === 400 || axErr.response.status === 403) {
        return err(
          `Бот не может отправить сообщение. Убедитесь, что вы написали боту /start. Ошибка: ${data?.description ?? ''}`,
          422,
        );
      }
      return err(data?.description ?? `HTTP ${axErr.response.status}`, 422);
    }
    return err(networkErrMessage(axErr), 502);
  }
}
