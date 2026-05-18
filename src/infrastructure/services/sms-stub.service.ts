import { ISMSService } from '@/application/ports/sms-service.port';

/**
 * Stub SMS service — logs messages to console.
 * Replace with a real provider (e.g. SMSC, МТС Exolve, etc.) when ready.
 */
export class SmsStubService implements ISMSService {
  async send(phone: string, message: string): Promise<void> {
    console.info(`[SmsStub] To: ${phone} | ${message}`);
  }

  async sendTemplate(phone: string, templateName: string, variables: Record<string, string>): Promise<void> {
    const vars = Object.entries(variables).map(([k, v]) => `${k}=${v}`).join(', ');
    console.info(`[SmsStub] To: ${phone} | template=${templateName} | vars: ${vars}`);
  }
}
