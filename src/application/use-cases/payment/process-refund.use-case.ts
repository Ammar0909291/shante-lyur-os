import { Refund } from '@/domain/entities';
import { RefundStatus, PaymentProvider } from '@/domain/enums';
import { Money } from '@/domain/value-objects';
import { NotFoundError, ConflictError, ValidationError } from '@/domain/errors';
import { RefundIssuedEvent } from '@/domain/events';
import {
  IPaymentRepository,
  IRefundRepository,
  IPaymentGateway,
  IEventBus,
  IAuditLogRepository,
} from '@/application/ports';
import { CreateRefundDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class ProcessRefundUseCase {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly refundRepo: IRefundRepository,
    private readonly yookassaGateway: IPaymentGateway,
    private readonly robokassaGateway: IPaymentGateway,
    private readonly eventBus: IEventBus,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(dto: CreateRefundDto, actorId: string) {
    const payment = await this.paymentRepo.findById(dto.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', dto.paymentId);
    }

    if (!payment.isRefundable) {
      throw new ConflictError('Payment is not refundable');
    }

    const refundAmount = Money.create(dto.amount, payment.amount.currency);

    // Check existing refunds total
    const existingRefunds = await this.refundRepo.findByPaymentId(payment.id);
    const totalRefunded = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + r.amount.amount, 0);

    if (totalRefunded + refundAmount.amount > payment.amount.amount) {
      throw new ValidationError('Total refunds exceed payment amount');
    }

    const refund = new Refund({
      id: crypto.randomUUID(),
      paymentId: payment.id,
      amount: refundAmount,
      reason: dto.reason,
      status: RefundStatus.PENDING,
      createdAt: new Date(),
    });

    const saved = await this.refundRepo.create(refund);

    // Process through gateway if online payment
    if (payment.provider === PaymentProvider.YOOKASSA || payment.provider === PaymentProvider.ROBOKASSA) {
      const gateway = payment.provider === PaymentProvider.YOOKASSA
        ? this.yookassaGateway
        : this.robokassaGateway;

      if (payment.providerPaymentId) {
        try {
          const result = await gateway.refund({
            providerPaymentId: payment.providerPaymentId,
            amount: refundAmount,
            reason: dto.reason,
          });

          if (result.success) {
            refund.markCompleted(result.providerRefundId!, actorId);
            await this.refundRepo.update(refund);

            // Update payment status
            const totalAfter = totalRefunded + refundAmount.amount;
            if (totalAfter >= payment.amount.amount) {
              payment.applyFullRefund();
            } else {
              payment.applyPartialRefund(refundAmount);
            }
            await this.paymentRepo.update(payment);
          } else {
            refund.markFailed();
            await this.refundRepo.update(refund);
            throw new ValidationError('Refund failed at payment gateway');
          }
        } catch (error) {
          refund.markFailed();
          await this.refundRepo.update(refund);
          throw error;
        }
      }
    } else {
      // Cash/terminal/transfer refunds are manual
      refund.markProcessing();
      await this.refundRepo.update(refund);
    }

    await this.eventBus.publish(
      new RefundIssuedEvent(saved.id, {
        paymentId: payment.id,
        amount: refundAmount.amount,
        reason: dto.reason,
        issuedBy: actorId,
        issuedAt: new Date().toISOString(),
      })
    );

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.REFUND_ISSUED,
        entityType: 'Refund',
        entityId: saved.id,
        newValues: {
          paymentId: payment.id,
          amount: refundAmount.amount,
          status: saved.status,
        },
      })
    );

    return { refund: saved };
  }
}
