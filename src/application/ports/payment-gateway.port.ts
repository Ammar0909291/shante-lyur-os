import { Money } from '@/domain/value-objects';

export interface PaymentGatewayInitResult {
  paymentUrl: string;
  providerPaymentId: string;
}

export interface PaymentGatewayVerifyResult {
  success: boolean;
  providerPaymentId: string;
  amount: number;
  /** Canonical status from provider; 'succeeded' = capture, 'canceled'/'failed' = terminal failure */
  providerStatus?: 'succeeded' | 'canceled' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

export interface IPaymentGateway {
  name: string;
  createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult>;
  verifyWebhook(payload: unknown, signature: string): Promise<PaymentGatewayVerifyResult>;
  refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }>;
}
