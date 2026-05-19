// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer') as typeof import('nodemailer');

import { IEmailService } from '@/application/ports/email-service.port';

export class SmtpEmailService implements IEmailService {
  private _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  private getTransporter() {
    if (this._transporter) return this._transporter;

    const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASS ?? '';
    const secure = port === 465;

    this._transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      tls: { rejectUnauthorized: false },
    });

    return this._transporter;
  }

  async send(to: string, subject: string, body: string, options?: { html?: string; attachments?: Array<{ filename: string; content: Buffer }> }): Promise<void> {
    const from = process.env.SMTP_FROM ?? 'noreply@shantelyur.ru';
    const html = options?.html ?? body;
    await this.getTransporter().sendMail({
      from,
      to,
      subject,
      text: body.replace(/<[^>]*>/g, ''),
      html,
      attachments: options?.attachments,
    });
  }

  async sendTemplate(to: string, template: string, variables: Record<string, string>): Promise<void> {
    const html = this.renderTemplate(template, variables);
    const subject = this.getSubjectForTemplate(template);
    await this.send(to, subject, html, { html });
  }

  private renderTemplate(template: string, vars: Record<string, string>): string {
    const base = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333}</style></head>
<body>{{content}}</body></html>`;

    const templates: Record<string, string> = {
      'welcome': `<h2>Добро пожаловать в Shante Lyur!</h2><p>Здравствуйте, {{name}}!</p><p>Спасибо за регистрацию. Ваш аккаунт готов к использованию.</p>`,
      'booking-confirmation': `<h2>Подтверждение записи</h2><p>{{name}}, ваша запись подтверждена:</p><ul><li>Услуга: {{service}}</li><li>Специалист: {{specialist}}</li><li>Дата: {{date}}</li><li>Время: {{time}}</li></ul>`,
      'booking-reminder': `<h2>Напоминание о записи</h2><p>{{name}}, напоминаем о вашей записи завтра:</p><ul><li>Услуга: {{service}}</li><li>Дата: {{date}}</li><li>Время: {{time}}</li></ul>`,
      'payment-receipt': `<h2>Квитанция об оплате</h2><p>{{name}}, оплата прошла успешно:</p><ul><li>Сумма: {{amount}} {{currency}}</li><li>Услуга: {{service}}</li><li>Дата: {{date}}</li></ul>`,
      'password-reset': `<h2>Сброс пароля</h2><p>Для сброса пароля перейдите по ссылке:</p><p><a href="{{link}}">Сбросить пароль</a></p><p>Ссылка действительна 1 час.</p>`,
      'account-locked': `<h2>Аккаунт временно заблокирован</h2><p>Ваш аккаунт заблокирован из-за множества неудачных попыток входа. Попробуйте позже или свяжитесь с администратором.</p>`,
    };

    let content = templates[template] ?? '<p>Шаблон не найден</p>';
    for (const [key, val] of Object.entries(vars)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }
    return base.replace('{{content}}', content);
  }

  private getSubjectForTemplate(template: string): string {
    const subjects: Record<string, string> = {
      'welcome': 'Добро пожаловать в Shante Lyur',
      'booking-confirmation': 'Подтверждение записи — Shante Lyur',
      'booking-reminder': 'Напоминание о записи — Shante Lyur',
      'payment-receipt': 'Квитанция об оплате — Shante Lyur',
      'password-reset': 'Сброс пароля — Shante Lyur',
      'account-locked': 'Безопасность аккаунта — Shante Lyur',
    };
    return subjects[template] ?? 'Shante Lyur';
  }
}
