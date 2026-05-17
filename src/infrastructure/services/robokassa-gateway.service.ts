import type {
  IPaymentGateway,
  PaymentGatewayInitResult,
  PaymentGatewayVerifyResult,
} from '@/application/ports/payment-gateway.port';
import type { Money } from '@/domain/value-objects/money.vo';

export class RobokassaGateway implements IPaymentGateway {
  readonly name = 'robokassa';

  async createPayment(_params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    throw new Error(
      'Robokassa is not configured. Set ROBOKASSA_MERCHANT_LOGIN and ROBOKASSA_PASSWORD.',
    );
  }

  async verifyWebhook(
    _payload: unknown,
    _signature: string,
  ): Promise<PaymentGatewayVerifyResult> {
    throw new Error('Robokassa is not configured.');
  }

  async refund(_params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    throw new Error('Robokassa is not configured.');
  }
}
