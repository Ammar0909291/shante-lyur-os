import { Payment } from '@/domain/entities';
import { PaymentProvider } from '@/domain/enums';

export type PaymentOrchestratorPort = IPaymentOrchestrator;
export interface IPaymentOrchestrator {
  createPayment(cmd: {
    appointmentId: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; redirectUrl?: string }>;
  processWebhook(provider: PaymentProvider, payload: unknown, signature?: string): Promise<Payment>;
  processRefund(paymentId: string, amount: number, reason?: string): Promise<Payment>;
}
