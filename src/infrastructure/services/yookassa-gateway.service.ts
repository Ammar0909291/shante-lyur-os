import { PaymentStatus } from '@/domain/enums/payment-status.enum';

export interface YooKassaCreateResult {
  providerPaymentId: string;
  status: PaymentStatus;
  redirectUrl?: string;
}

export interface YooKassaWebhookResult {
  paid: boolean;
  providerPaymentId: string;
  status: PaymentStatus;
}

export class YooKassaGateway {
  async createPayment(_params: unknown): Promise<YooKassaCreateResult> {
    throw new Error('YooKassa payment gateway not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY.');
  }

  async verifyWebhook(_payload: unknown, _signature?: string): Promise<YooKassaWebhookResult> {
    throw new Error('YooKassa payment gateway not configured.');
  }

  async refund(_providerPaymentId: string, _amount: number): Promise<{ status: PaymentStatus }> {
    throw new Error('YooKassa payment gateway not configured.');
  }
}
