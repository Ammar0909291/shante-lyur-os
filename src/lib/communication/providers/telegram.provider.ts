import { BaseProvider } from './base.provider';
import { tgPost, type TelegramApiResponse } from './telegram-http';
import type { MessagePayload, SendResult } from '../types';

interface TelegramSendMessageParams {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

export class TelegramProvider extends BaseProvider {
  readonly name = 'Telegram Bot API';
  readonly channel = 'telegram';

  private botToken: string;
  private readonly webhookSecret: string;

  constructor() {
    super();
    this.botToken = process.env['TELEGRAM_BOT_TOKEN'] ?? '';
    this.webhookSecret = process.env['TELEGRAM_WEBHOOK_SECRET'] ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.botToken);
  }

  private async resolveToken(): Promise<string> {
    if (this.botToken) return this.botToken;
    try {
      const { prisma } = await import('@/infrastructure/config/prisma-client');
      const row = await (prisma as unknown as { systemConfig: { findUnique: (args: unknown) => Promise<{ value: string } | null> } })
        .systemConfig.findUnique({ where: { key: 'telegram_bot_token' }, select: { value: true } });
      if (row?.value) {
        this.botToken = row.value;
      }
    } catch {}
    return this.botToken;
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    const token = await this.resolveToken();
    if (!token) {
      this.log('warn', 'Not configured — message not sent', { to: payload.to });
      return { success: false, error: 'Telegram provider not configured' };
    }

    const params: TelegramSendMessageParams = {
      chat_id: payload.to,
      text: payload.body,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    try {
      this.log('info', `Sending message to chat_id=${payload.to}`);
      const json: TelegramApiResponse = await tgPost(token, 'sendMessage', params);

      if (!json.ok) {
        const errMsg = json.description ?? `error_code=${json.error_code}`;
        this.log('error', `Send failed: ${errMsg}`);
        return { success: false, error: errMsg, providerResponse: json as unknown as Record<string, unknown> };
      }

      const result = json.result as { message_id?: number } | undefined;
      const externalId = String(result?.message_id ?? '');
      this.log('info', `Sent OK, message_id=${externalId}`);
      return { success: true, externalId, providerResponse: json as unknown as Record<string, unknown> };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.log('error', `Network error: ${error}`);
      return { success: false, error };
    }
  }

  async setWebhook(webhookUrl: string): Promise<boolean> {
    const token = await this.resolveToken();
    if (!token) return false;
    try {
      const json = await tgPost(token, 'setWebhook', {
        url: webhookUrl,
        secret_token: this.webhookSecret || undefined,
        allowed_updates: ['message', 'callback_query'],
      });
      this.log('info', `setWebhook result: ${json.ok}`);
      return json.ok;
    } catch {
      return false;
    }
  }

  verifyWebhook(_payload: unknown, signature: string): boolean {
    if (!this.webhookSecret) return true;
    return signature === this.webhookSecret;
  }
}
