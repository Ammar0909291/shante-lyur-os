export type EmailServicePort = IEmailService;

export interface IEmailService {
  send(to: string, subject: string, html: string, text?: string): Promise<void>;
  sendTemplate(to: string, templateName: string, variables: Record<string, string>): Promise<void>;
}
