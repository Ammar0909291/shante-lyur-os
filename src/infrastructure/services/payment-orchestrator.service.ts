import { PaymentOrchestratorPort } from '@/application/ports/payment-orchestrator.port';
import type { IPaymentGateway as PaymentGatewayPort } from '@/application/ports/payment-gateway.port';
import { PaymentRepositoryPort } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { ConflictError } from '@/domain/errors/conflict-error';

interface CreatePaymentCommand {
  appointmentId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  description: string;
  returnUrl: string;
  idempotencyKey?: string;
}

export class PaymentOrchestrator implements PaymentOrchestratorPort {
  constructor(
    private readonly yooKassa: PaymentGatewayPort,
    private readonly robokassa: PaymentGatewayPort,
    private readonly paymentRepo: PaymentRepositoryPort,
  ) {}

  async createPayment(cmd: CreatePaymentCommand): Promise<{ payment: Payment; redirectUrl?: string }> {
    if (cmd.idempotencyKey) {
      const existing = await this.paymentRepo.findByIdempotencyKey(cmd.idempotencyKey);
      if (existing) return { payment: existing };
    }

    const gateway = this.selectGateway(cmd.provider);

    const result = await gateway.createPayment({
      appointmentId: cmd.appointmentId,
      amount: cmd.amount,
      currency: cmd.currency,
      description: cmd.description,
      returnUrl: cmd.returnUrl,
      idempotencyKey: cmd.idempotencyKey,
    });

    const payment = Payment.create({
      appointmentId: cmd.appointmentId,
      amount: Money.create(cmd.amount).getValue(),
      currency: cmd.currency,
      provider: cmd.provider,
      providerPaymentId: result.providerPaymentId,
      status: result.status,
      idempotencyKey: cmd.idempotencyKey,
    });

    const saved = await this.paymentRepo.create(payment);
    return { payment: saved, redirectUrl: result.redirectUrl };
  }

  async processWebhook(provider: PaymentProvider, payload: unknown, signature?: string): Promise<Payment> {
    const gateway = this.selectGateway(provider);
    const webhook = await gateway.verifyWebhook(payload, signature);

    const payment = await this.paymentRepo.findByProviderPaymentId(provider, webhook.providerPaymentId);
    if (!payment) throw new NotFoundError('Payment', webhook.providerPaymentId);

    if (webhook.paid && payment.status !== PaymentStatus.COMPLETED) {
      payment.markAsPaid();
    } else if (webhook.status === PaymentStatus.FAILED) {
      payment.markAsFailed();
    } else if (webhook.status === PaymentStatus.REFUNDED) {
      payment.markAsRefunded(payment.amount);
    }

    return this.paymentRepo.update(payment);
  }

  async processRefund(paymentId: string, amount: number, reason?: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment', paymentId);
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new ConflictError('Cannot refund a payment that is not completed');
    }
    if (payment.refundedAmount + amount > payment.amount) {
      throw new ConflictError('Refund amount exceeds payment amount');
    }

    const gateway = this.selectGateway(payment.provider);
    const refundResult = await gateway.refund(payment.providerPaymentId!, amount);

    if (refundResult.status === PaymentStatus.REFUNDED || refundResult.status === PaymentStatus.REFUND_PENDING) {
      payment.markAsRefunded(payment.refundedAmount + amount);
    }

    return this.paymentRepo.update(payment);
  }

  private selectGateway(provider: PaymentProvider): PaymentGatewayPort {
    switch (provider) {
      case PaymentProvider.YOOKASSA: return this.yooKassa;
      case PaymentProvider.ROBOKASSA: return this.robokassa;
      default: throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}
