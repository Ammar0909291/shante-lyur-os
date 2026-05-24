import { BaseProvider } from './base.provider';
import type { MessagePayload, SendResult } from '../types';

interface WhatsAppTextMessage {
  messaging_product: string;
  to: string;
  type: 'text';
  text: { body: string; preview_url?: boolean };
}

interface WhatsAppTemplateMessage {
  messaging_product: string;
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: 'body' | 'header' | 'button';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

type WhatsAppMessage = WhatsAppTextMessage | WhatsAppTemplateMessage;

interface WhatsAppApiResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; type: string; code: number };
}

export class WhatsAppProvider extends BaseProvider {
  readonly name = 'WhatsApp Business API';
  readonly channel = 'whatsapp';

  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly webhookVerifyToken: string;
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  constructor() {
    super();
    this.phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'] ?? '';
    this.accessToken = process.env['WHATSAPP_ACCESS_TOKEN'] ?? '';
    this.webhookVerifyToken = process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!this.isConfigured()) {
      this.log('warn', 'Not configured — message not sent', { to: payload.to });
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    const normalizedPhone = this.normalizePhone(payload.to);
    const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;

    let message: WhatsAppMessage;

    if (payload.templateName && payload.templateData) {
      const params = Object.values(payload.templateData).map((v) => ({
        type: 'text' as const,
        text: String(v),
      }));
      message = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: payload.language === 'en' ? 'en_US' : 'ru' },
          components: params.length
            ? [{ type: 'body', parameters: params }]
            : undefined,
        },
      };
    } else {
      message = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body: payload.body, preview_url: false },
      };
    }

    try {
      this.log('info', `Sending message to ${normalizedPhone}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const json = (await res.json()) as WhatsAppApiResponse;

      if (!res.ok || json.error) {
        const errMsg = json.error?.message ?? `HTTP ${res.status}`;
        this.log('error', `Send failed: ${errMsg}`);
        return { success: false, error: errMsg, providerResponse: json as Record<string, unknown> };
      }

      const externalId = json.messages?.[0]?.id;
      this.log('info', `Sent OK, messageId=${externalId}`);
      return { success: true, externalId, providerResponse: json as Record<string, unknown> };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.log('error', `Network error: ${error}`);
      return { success: false, error };
    }
  }

  verifyWebhook(payload: unknown, mode?: string): boolean {
    if (mode === 'subscribe' && typeof payload === 'string') {
      return payload === this.webhookVerifyToken;
    }
    return true;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
