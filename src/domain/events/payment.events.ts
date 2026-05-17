import { BaseDomainEvent } from './domain-event';
import { PaymentProvider, PaymentStatus } from '../enums';

export class PaymentInitiatedEvent extends BaseDomainEvent {
  constructor(
    paymentId: string,
    payload: {
      appointmentId: string;
      amount: number;
      currency: string;
      provider: PaymentProvider;
      clientId: string;
    }
  ) {
    super('PAYMENT_INITIATED', paymentId, 'Payment', payload);
  }
}

export class PaymentReceivedEvent extends BaseDomainEvent {
  constructor(
    paymentId: string,
    payload: {
      appointmentId: string;
      amount: number;
      currency: string;
      provider: PaymentProvider;
      providerPaymentId: string;
      paidAt: string;
    }
  ) {
    super('PAYMENT_RECEIVED', paymentId, 'Payment', payload);
  }
}

export class PaymentFailedEvent extends BaseDomainEvent {
  constructor(
    paymentId: string,
    payload: {
      appointmentId: string;
      amount: number;
      reason: string;
      failedAt: string;
    }
  ) {
    super('PAYMENT_FAILED', paymentId, 'Payment', payload);
  }
}

export class RefundIssuedEvent extends BaseDomainEvent {
  constructor(
    refundId: string,
    payload: {
      paymentId: string;
      amount: number;
      reason: string;
      issuedBy: string;
      issuedAt: string;
    }
  ) {
    super('REFUND_ISSUED', refundId, 'Refund', payload);
  }
}
