import { Payment } from '@/domain/entities/payment.entity';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';

export interface PaymentOrchestratorPort {
  createPayment(cmd: {
    appointmentId: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; paymentUrl?: string }>;
  processWebhook(provider: PaymentProvider, payload: unknown, signature?: string): Promise<Payment>;
  processRefund(paymentId: string, amount: number, reason?: string): Promise<Payment>;
}
