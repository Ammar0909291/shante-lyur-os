import { Money } from '@/domain/value-objects';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';

export interface PaymentGatewayPort {
  createPayment(params: {
    appointmentId: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{
    providerPaymentId: string;
    status: PaymentStatus;
    redirectUrl?: string;
  }>;
  verifyWebhook(payload: unknown, signature?: string): Promise<{
    paid: boolean;
    providerPaymentId: string;
    status: PaymentStatus;
  }>;
  refund(providerPaymentId: string, amount: number): Promise<{
    status: PaymentStatus;
  }>;
}

export interface PaymentGatewayInitResult {
  paymentUrl: string;
  providerPaymentId: string;
}

export interface PaymentGatewayVerifyResult {
  success: boolean;
  providerPaymentId: string;
  amount: number;
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
