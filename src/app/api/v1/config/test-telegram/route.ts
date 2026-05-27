export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
  error_code?: number;
  result?: unknown;
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
    return err('Telegram Bot Token не настроен. Сохраните токен в разделе Коммуникации → Настройки.', 422);
  }

  // Step 1: verify token with getMe
  try {
    const getMeRes = await axios.get<TelegramApiResponse>(
      `https://api.telegram.org/bot${botToken}/getMe`,
      { timeout: 10_000 },
    );
    if (!getMeRes.data.ok) {
      return err(`Токен недействителен: ${getMeRes.data.description ?? 'Telegram отклонил запрос'}`, 422);
    }
  } catch (e) {
    const axErr = e as AxiosError;
    if (axErr.response) {
      const data = axErr.response.data as TelegramApiResponse | undefined;
      return err(`Ошибка проверки токена: ${data?.description ?? `HTTP ${axErr.response.status}`}`, 422);
    }
    const msg = axErr.message ?? 'Сетевая ошибка';
    return err(
      `Не удалось подключиться к Telegram API: ${msg}. Проверьте, доступен ли api.telegram.org с вашего сервера.`,
      502,
    );
  }

  // Step 2: send test message
  const salonName = process.env['SALON_NAME'] ?? 'Shante Lyur';
  const text = `✅ <b>${salonName}</b>\n\nТестовое сообщение отправлено успешно!\nTelegram-интеграция работает корректно.`;

  try {
    const sendRes = await axios.post<TelegramApiResponse>(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true },
      { timeout: 10_000 },
    );

    if (!sendRes.data.ok) {
      const msg = sendRes.data.description ?? `Telegram error ${sendRes.data.error_code ?? ''}`;
      return err(msg, 422);
    }

    return ok({ message: `✅ Сообщение отправлено в chat_id ${chatId}` });
  } catch (e) {
    const axErr = e as AxiosError;
    if (axErr.response) {
      const data = axErr.response.data as TelegramApiResponse | undefined;
      // 400 = bad request (usually wrong chat_id)
      if (axErr.response.status === 400) {
        return err(`Неверный chat_id или бот не может отправить сообщение этому пользователю. Убедитесь, что вы написали боту /start. Ошибка: ${data?.description ?? ''}`, 422);
      }
      return err(data?.description ?? `HTTP ${axErr.response.status}`, 422);
    }
    const msg = axErr.message ?? 'Сетевая ошибка';
    return err(
      `Не удалось отправить сообщение: ${msg}. Проверьте, доступен ли api.telegram.org с вашего сервера.`,
      502,
    );
  }
}
