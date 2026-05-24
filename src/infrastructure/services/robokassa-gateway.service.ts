import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects';

export class RobokassaGateway implements IPaymentGateway {
  readonly name = 'ROBOKASSA';

  async createPayment(_params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    throw new Error('Robokassa payment gateway not configured. Set ROBOKASSA_MERCHANT_LOGIN and ROBOKASSA_PASSWORD.');
  }

  async verifyWebhook(_payload: unknown, _signature: string): Promise<PaymentGatewayVerifyResult> {
    throw new Error('Robokassa payment gateway not configured.');
  }

  async refund(_params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    throw new Error('Robokassa payment gateway not configured.');
  }
}
