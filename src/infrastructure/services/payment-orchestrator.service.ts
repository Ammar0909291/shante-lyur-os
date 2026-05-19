import { v4 as uuidv4 } from 'uuid';
import { PaymentOrchestratorPort } from '@/application/ports/payment-orchestrator.port';
import { PaymentGatewayPort } from '@/application/ports/payment-gateway.port';
import { PaymentRepositoryPort } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { ConflictError } from '@/domain/errors/conflict-error';

export class PaymentOrchestrator implements PaymentOrchestratorPort {
  constructor(
    private readonly yooKassa: PaymentGatewayPort,
    private readonly robokassa: PaymentGatewayPort,
    private readonly paymentRepo: PaymentRepositoryPort,
  ) {}

  async createPayment(cmd: {
    appointmentId: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; redirectUrl?: string }> {
    const gateway = this.selectGateway(cmd.provider);
    const amount = Money.create(cmd.amount, cmd.currency);

    const result = await gateway.createPayment({
      amount,
      description: cmd.description,
      orderId: cmd.appointmentId,
      returnUrl: cmd.returnUrl,
    });

    const payment = new Payment({
      id: uuidv4(),
      appointmentId: cmd.appointmentId,
      provider: cmd.provider,
      providerPaymentId: result.providerPaymentId,
      amount,
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

    if (webhook.success) {
      if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
        payment.markAuthorized(webhook.providerPaymentId);
        payment.markCaptured();
      }
    } else {
      if (!payment.isTerminal) {
        payment.markFailed('Webhook indicated failure');
      }
    }

    return this.paymentRepo.update(payment);
  }

  async processRefund(paymentId: string, amount: number, _reason?: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment', paymentId);
    if (!payment.isRefundable) {
      throw new ConflictError('Payment is not in a refundable state');
    }

    const gateway = this.selectGateway(payment.provider);
    const refundMoney = Money.create(amount, payment.amount.currency);

    if (!payment.providerPaymentId) {
      throw new ConflictError('Payment has no provider payment ID for refund');
    }

    const refundResult = await gateway.refund({
      providerPaymentId: payment.providerPaymentId,
      amount: refundMoney,
    });

    if (refundResult.success) {
      payment.markCancelled();
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
