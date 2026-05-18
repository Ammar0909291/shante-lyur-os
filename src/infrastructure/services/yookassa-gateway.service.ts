import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';

// YooKassa integration — disabled until credentials are configured.
// Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY in .env to enable.
export class YooKassaGateway implements IPaymentGateway {
  readonly name = 'yookassa';

  private get isConfigured(): boolean {
    return !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
  }

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    if (!this.isConfigured) {
      throw new Error('YooKassa is not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY in .env');
    }
    throw new Error('YooKassa createPayment not yet implemented');
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentGatewayVerifyResult> {
    if (!this.isConfigured) {
      throw new Error('YooKassa is not configured');
    }
    throw new Error('YooKassa verifyWebhook not yet implemented');
  }

  async refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    if (!this.isConfigured) {
      throw new Error('YooKassa is not configured');
    }
    throw new Error('YooKassa refund not yet implemented');
  }
}
