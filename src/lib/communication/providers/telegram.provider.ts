import { BaseProvider } from './base.provider';
import type { MessagePayload, SendResult } from '../types';

interface TelegramSendMessageParams {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

interface TelegramApiResponse {
  ok: boolean;
  result?: { message_id: number };
  error_code?: number;
  description?: string;
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

  get apiBase(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
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

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const json = (await res.json()) as TelegramApiResponse;

      if (!json.ok) {
        const errMsg = json.description ?? `error_code=${json.error_code}`;
        this.log('error', `Send failed: ${errMsg}`);
        return { success: false, error: errMsg, providerResponse: json as unknown as Record<string, unknown> };
      }

      const externalId = String(json.result?.message_id ?? '');
      this.log('info', `Sent OK, message_id=${externalId}`);
      return { success: true, externalId, providerResponse: json as unknown as Record<string, unknown> };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.log('error', `Network error: ${error}`);
      return { success: false, error };
    }
  }

  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBase}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: this.webhookSecret || undefined,
          allowed_updates: ['message', 'callback_query'],
        }),
      });
      const json = (await res.json()) as TelegramApiResponse;
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
