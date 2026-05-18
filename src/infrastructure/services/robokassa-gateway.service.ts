import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';

// Robokassa integration — disabled until credentials are configured.
// Set ROBOKASSA_MERCHANT_LOGIN, ROBOKASSA_PASSWORD1, ROBOKASSA_PASSWORD2 in .env to enable.
export class RobokassaGateway implements IPaymentGateway {
  readonly name = 'robokassa';

  private get isConfigured(): boolean {
    return !!(
      process.env.ROBOKASSA_MERCHANT_LOGIN &&
      process.env.ROBOKASSA_PASSWORD1 &&
      process.env.ROBOKASSA_PASSWORD2
    );
  }

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    if (!this.isConfigured) {
      throw new Error('Robokassa is not configured. Set ROBOKASSA_MERCHANT_LOGIN, ROBOKASSA_PASSWORD1, ROBOKASSA_PASSWORD2 in .env');
    }
    throw new Error('Robokassa createPayment not yet implemented');
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentGatewayVerifyResult> {
    if (!this.isConfigured) {
      throw new Error('Robokassa is not configured');
    }
    throw new Error('Robokassa verifyWebhook not yet implemented');
  }

  async refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    if (!this.isConfigured) {
      throw new Error('Robokassa is not configured');
    }
    throw new Error('Robokassa refund not yet implemented');
  }
}
