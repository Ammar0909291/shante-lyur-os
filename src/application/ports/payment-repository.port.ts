import { Payment } from '@/domain/entities';
import { PaymentStatus, PaymentProvider } from '@/domain/enums';

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByAppointmentId(appointmentId: string): Promise<Payment[]>;
  findByProviderPaymentId(providerId: string, provider: PaymentProvider): Promise<Payment | null>;
  findMany(options: {
    status?: PaymentStatus;
    provider?: PaymentProvider;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: Payment[]; total: number }>;
  create(payment: Payment): Promise<Payment>;
  update(payment: Payment): Promise<Payment>;
  getRevenueSummary(from: Date, to: Date): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    byProvider: Record<string, number>;
  }>;
}

// Alias used by PaymentOrchestrator
export type PaymentRepositoryPort = IPaymentRepository;
