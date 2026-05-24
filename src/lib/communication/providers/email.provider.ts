import nodemailer, { type Transporter } from 'nodemailer';
import { BaseProvider } from './base.provider';
import type { MessagePayload, SendResult } from '../types';

function stripHtml(html: string): string {
  return html
    .replace(/<b>(.*?)<\/b>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function extractSubject(body: string, fallback: string): string {
  // Use first non-empty line after stripping HTML as subject
  const plain = stripHtml(body);
  const first = plain.split('\n').find((l) => l.trim().length > 0) ?? '';
  return first.slice(0, 80) || fallback;
}

export class EmailProvider extends BaseProvider {
  readonly name = 'EmailProvider';
  readonly channel = 'email';

  private _transporter: Transporter | null = null;

  private get transporter(): Transporter {
    if (!this._transporter) {
      this._transporter = nodemailer.createTransport({
        host: process.env['SMTP_HOST'] ?? 'smtp.gmail.com',
        port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
        secure: process.env['SMTP_SECURE'] === 'true',
        auth: {
          user: process.env['SMTP_USER'],
          pass: process.env['SMTP_PASS'],
        },
      });
    }
    return this._transporter;
  }

  isConfigured(): boolean {
    return !!(process.env['SMTP_USER'] && process.env['SMTP_PASS']);
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    try {
      const htmlBody = payload.body.replace(/\n/g, '<br>');
      const plainBody = stripHtml(payload.body);
      const subject =
        payload.subject ??
        extractSubject(payload.body, process.env['APP_NAME'] ?? 'Shante Lyur');

      const info = await this.transporter.sendMail({
        from: `"${process.env['APP_NAME'] ?? 'Shante Lyur'}" <${process.env['SMTP_FROM'] ?? 'noreply@shantelyur.ru'}>`,
        to: payload.to,
        subject,
        text: plainBody,
        html: `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#0A0A0F;color:#F0EDE8;padding:32px">${htmlBody}</body></html>`,
      });

      return {
        success: true,
        externalId: info.messageId,
        providerResponse: {
          accepted: info.accepted as unknown as Record<string, unknown>,
          rejected: info.rejected as unknown as Record<string, unknown>,
          response: info.response,
        },
      };
    } catch (error) {
      this.log('error', 'Email send failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }
}
