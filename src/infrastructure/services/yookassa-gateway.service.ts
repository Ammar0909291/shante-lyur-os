import type {
  IPaymentGateway,
  PaymentGatewayInitResult,
  PaymentGatewayVerifyResult,
} from '@/application/ports/payment-gateway.port';
import type { Money } from '@/domain/value-objects/money.vo';

export class YooKassaGateway implements IPaymentGateway {
  readonly name = 'yookassa';

  async createPayment(_params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    throw new Error(
      'YooKassa is not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY.',
    );
  }

  async verifyWebhook(
    _payload: unknown,
    _signature: string,
  ): Promise<PaymentGatewayVerifyResult> {
    throw new Error('YooKassa is not configured.');
  }

  async refund(_params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    throw new Error('YooKassa is not configured.');
  }
}
