import { PaymentStatus } from '@/domain/enums/payment-status.enum';

export interface RobokassaCreateResult {
  providerPaymentId: string;
  status: PaymentStatus;
  redirectUrl?: string;
}

export interface RobokassaWebhookResult {
  paid: boolean;
  providerPaymentId: string;
  status: PaymentStatus;
}

export class RobokassaGateway {
  async createPayment(_params: unknown): Promise<RobokassaCreateResult> {
    throw new Error('Robokassa payment gateway not configured. Set ROBOKASSA_MERCHANT_LOGIN and ROBOKASSA_PASSWORD.');
  }

  async verifyWebhook(_payload: unknown, _signature?: string): Promise<RobokassaWebhookResult> {
    throw new Error('Robokassa payment gateway not configured.');
  }

  async refund(_providerPaymentId: string, _amount: number): Promise<{ status: PaymentStatus }> {
    throw new Error('Robokassa payment gateway not configured.');
  }
}
