import type { MessagePayload, SendResult } from '../types';

export interface IMessageProvider {
  readonly name: string;
  readonly channel: string;
  isConfigured(): boolean;
  send(payload: MessagePayload): Promise<SendResult>;
  verifyWebhook(payload: unknown, signature: string): boolean;
}

export abstract class BaseProvider implements IMessageProvider {
  abstract readonly name: string;
  abstract readonly channel: string;
  abstract isConfigured(): boolean;
  abstract send(payload: MessagePayload): Promise<SendResult>;

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    return true;
  }

  protected log(level: 'info' | 'warn' | 'error', msg: string, data?: unknown): void {
    const prefix = `[${this.name}]`;
    if (level === 'error') console.error(prefix, msg, data ?? '');
    else if (level === 'warn') console.warn(prefix, msg, data ?? '');
    else console.info(prefix, msg, data ?? '');
  }
}
