export type EmailServicePort = IEmailService;
export interface IEmailService {
  send(to: string, subject: string, body: string, options?: { html?: string; attachments?: Array<{ filename: string; content: Buffer }> }): Promise<void>;
  sendTemplate(to: string, templateName: string, variables: Record<string, string>): Promise<void>;
}
