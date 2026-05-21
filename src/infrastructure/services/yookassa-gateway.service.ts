import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects';

export class YooKassaGateway implements IPaymentGateway {
  readonly name = 'YOOKASSA';

  async createPayment(_params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    throw new Error('YooKassa payment gateway not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY.');
  }

  async verifyWebhook(_payload: unknown, _signature: string): Promise<PaymentGatewayVerifyResult> {
    throw new Error('YooKassa payment gateway not configured.');
  }

  async refund(_params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    throw new Error('YooKassa payment gateway not configured.');
  }
}
