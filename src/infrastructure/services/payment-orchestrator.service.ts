import type { IPaymentGateway } from '@/application/ports/payment-gateway.port';
import { IPaymentRepository } from '@/application/ports/payment-repository.port';
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

export class PaymentOrchestrator {
  constructor(
    private readonly yooKassa: IPaymentGateway,
    private readonly robokassa: IPaymentGateway,
    private readonly paymentRepo: IPaymentRepository,
  ) {}

  async createPayment(cmd: CreatePaymentCommand): Promise<{ payment: Payment; redirectUrl?: string }> {
    const gateway = this.selectGateway(cmd.provider);

    const amountMoney = Money.create(cmd.amount, cmd.currency);

    const result = await gateway.createPayment({
      amount: amountMoney,
      description: cmd.description,
      orderId: cmd.appointmentId,
      returnUrl: cmd.returnUrl,
      metadata: cmd.idempotencyKey ? { idempotencyKey: cmd.idempotencyKey } : undefined,
    });

    const payment = new Payment({
      id: crypto.randomUUID(),
      appointmentId: cmd.appointmentId,
      amount: amountMoney,
      provider: cmd.provider,
      providerPaymentId: result.providerPaymentId,
      status: PaymentStatus.PENDING,
      idempotencyKey: cmd.idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.paymentRepo.create(payment);
    return { payment: saved, redirectUrl: result.paymentUrl };
  }

  async processWebhook(provider: PaymentProvider, payload: unknown, signature?: string): Promise<Payment> {
    const gateway = this.selectGateway(provider);
    const webhook = await gateway.verifyWebhook(payload, signature ?? '');

    const payment = await this.paymentRepo.findByProviderPaymentId(webhook.providerPaymentId, provider);
    if (!payment) throw new NotFoundError('Payment', webhook.providerPaymentId);

    if (webhook.success && payment.status !== PaymentStatus.CAPTURED) {
      payment.markCaptured();
    } else if (!webhook.success) {
      payment.markFailed('Webhook reported failure');
    }

    return this.paymentRepo.update(payment);
  }

  async processRefund(paymentId: string, amount: number, reason?: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment', paymentId);
    if (!payment.isRefundable) {
      throw new ConflictError('Cannot refund a payment that is not refundable');
    }

    const refundAmount = Money.create(amount, payment.amount.currency);

    const gateway = this.selectGateway(payment.provider);
    const refundResult = await gateway.refund({
      providerPaymentId: payment.providerPaymentId!,
      amount: refundAmount,
      reason,
    });

    if (refundResult.success) {
      payment.applyFullRefund();
    }

    return this.paymentRepo.update(payment);
  }

  private selectGateway(provider: PaymentProvider): IPaymentGateway {
    switch (provider) {
      case PaymentProvider.YOOKASSA: return this.yooKassa;
      case PaymentProvider.ROBOKASSA: return this.robokassa;
      default: throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}
