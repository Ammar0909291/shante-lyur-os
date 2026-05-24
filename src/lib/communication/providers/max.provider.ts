import { BaseProvider } from './base.provider';
import type { MessagePayload, SendResult } from '../types';

// MAX (VK's messenger platform) Bot API
// Docs: https://dev.max.ru/

interface MaxSendMessageBody {
  text: string;
  format?: 'html' | 'markdown';
}

interface MaxApiResponse {
  update_id?: number;
  message_id?: number;
  error?: string;
  code?: number;
}

export class MaxProvider extends BaseProvider {
  readonly name = 'MAX Bot API';
  readonly channel = 'max';

  private readonly botToken: string;
  private readonly apiBase = 'https://botapi.max.ru';

  constructor() {
    super();
    this.botToken = process.env['MAX_BOT_TOKEN'] ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.botToken);
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!this.isConfigured()) {
      this.log('warn', 'Not configured — message not sent', { to: payload.to });
      return { success: false, error: 'MAX provider not configured' };
    }

    const url = `${this.apiBase}/messages?access_token=${this.botToken}&user_id=${payload.to}`;

    const body: MaxSendMessageBody = {
      text: payload.body,
      format: 'html',
    };

    try {
      this.log('info', `Sending message to user_id=${payload.to}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as MaxApiResponse;

      if (!res.ok || json.error) {
        const errMsg = json.error ?? `HTTP ${res.status}`;
        this.log('error', `Send failed: ${errMsg}`);
        return { success: false, error: errMsg, providerResponse: json as Record<string, unknown> };
      }

      const externalId = String(json.message_id ?? json.update_id ?? '');
      this.log('info', `Sent OK, message_id=${externalId}`);
      return { success: true, externalId, providerResponse: json as Record<string, unknown> };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.log('error', `Network error: ${error}`);
      return { success: false, error };
    }
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    return true;
  }
}
