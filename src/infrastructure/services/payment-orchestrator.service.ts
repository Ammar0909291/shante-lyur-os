import { PaymentOrchestratorPort } from '@/application/ports/payment-orchestrator.port';
import { IPaymentGateway } from '@/application/ports/payment-gateway.port';
import { IPaymentRepository } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { ConflictError } from '@/domain/errors/conflict-error';
import { prisma } from '@/infrastructure/config/prisma-client';

export class PaymentOrchestrator implements PaymentOrchestratorPort {
  constructor(
    private readonly yooKassa: IPaymentGateway,
    private readonly robokassa: IPaymentGateway,
    private readonly paymentRepo: IPaymentRepository,
  ) {}

  async createPayment(cmd: {
    appointmentId: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; paymentUrl?: string }> {
    if (cmd.idempotencyKey) {
      const existing = await this.paymentRepo.findByIdempotencyKey(cmd.idempotencyKey);
      if (existing) return { payment: existing };
    }

    const gateway = this.selectGateway(cmd.provider);
    const amount = Money.create(cmd.amount, cmd.currency);

    const result = await gateway.createPayment({
      amount,
      description: cmd.description,
      orderId: cmd.appointmentId,
      returnUrl: cmd.returnUrl,
    });

    const payment = Payment.reconstitute({
      id: crypto.randomUUID(),
      appointmentId: cmd.appointmentId,
      amount,
      provider: cmd.provider,
      providerPaymentId: result.providerPaymentId,
      status: PaymentStatus.PENDING,
      idempotencyKey: cmd.idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.paymentRepo.create(payment);
    return { payment: saved, paymentUrl: result.paymentUrl };
  }

  async processWebhook(provider: PaymentProvider, payload: unknown, signature?: string): Promise<Payment> {
    const gateway = this.selectGateway(provider);
    const webhook = await gateway.verifyWebhook(payload, signature ?? '');

    const payment = await this.paymentRepo.findByProviderPaymentId(webhook.providerPaymentId, provider);
    if (!payment) throw new NotFoundError('Payment', webhook.providerPaymentId);

    const wasAlreadyCaptured = payment.status === PaymentStatus.CAPTURED;

    if (webhook.success && !wasAlreadyCaptured) {
      payment.markCaptured();
    } else if (!webhook.success && payment.status === PaymentStatus.PROCESSING) {
      payment.markFailed('Webhook reported failure');
    }

    const updated = await this.paymentRepo.update(payment);

    // Auto-write commission PayrollEntry when payment transitions to CAPTURED (idempotent)
    if (webhook.success && !wasAlreadyCaptured) {
      try {
        const appointment = await prisma.appointment.findUnique({
          where: { id: payment.appointmentId },
          select: { specialistId: true },
        });

        if (appointment?.specialistId) {
          const existing = await prisma.payrollEntry.findFirst({
            where: { paymentId: payment.id, type: 'COMMISSION' },
            select: { id: true },
          });

          if (!existing) {
            const [paymentRow, salaryConfig, specialist] = await Promise.all([
              prisma.payment.findUnique({
                where: { id: payment.id },
                select: { commissionRate: true },
              }),
              prisma.specialistSalaryConfig.findUnique({
                where: { specialistId: appointment.specialistId },
                select: { commissionRate: true },
              }),
              prisma.specialist.findUnique({
                where: { id: appointment.specialistId },
                select: { commissionRate: true },
              }),
            ]);

            // Priority: payment.commissionRate override → salaryConfig.commissionRate → specialist.commissionRate
            const rate =
              (paymentRow?.commissionRate != null ? Number(paymentRow.commissionRate) : null) ??
              (salaryConfig?.commissionRate != null ? Number(salaryConfig.commissionRate) : null) ??
              (specialist?.commissionRate != null ? Number(specialist.commissionRate) : 0);

            const commissionAmount = Math.round(payment.amount.amount * rate * 100) / 100;
            const paidAt = payment.paidAt ?? new Date();
            const periodMonth = paidAt.toISOString().substring(0, 7);

            await prisma.payrollEntry.create({
              data: {
                specialistId: appointment.specialistId,
                paymentId: payment.id,
                appointmentId: payment.appointmentId,
                type: 'COMMISSION',
                amount: commissionAmount,
                rate,
                periodMonth,
                description: 'Комиссия с продажи',
                isLocked: false,
              },
            });
          }
        }
      } catch (err) {
        // Commission write failure must not break the webhook response
        console.error('[PaymentOrchestrator] Failed to write commission PayrollEntry:', err);
      }
    }

    return updated;
  }

  async processRefund(paymentId: string, amount: number, _reason?: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment', paymentId);
    if (!payment.isRefundable) {
      throw new ConflictError('Cannot refund a payment that is not refundable');
    }

    const gateway = this.selectGateway(payment.provider);
    const refundAmount = Money.create(amount, payment.amount.currency);

    const refundResult = await gateway.refund({
      providerPaymentId: payment.providerPaymentId!,
      amount: refundAmount,
    });

    if (refundResult.success) {
      if (refundAmount.amount >= payment.amount.amount) {
        payment.applyFullRefund();
      } else {
        payment.applyPartialRefund(refundAmount);
      }
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
