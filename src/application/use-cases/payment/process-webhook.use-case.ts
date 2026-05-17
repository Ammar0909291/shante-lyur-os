import { PaymentStatus, PaymentProvider } from '@/domain/enums';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { Money } from '@/domain/value-objects';
import { PaymentReceivedEvent, PaymentFailedEvent } from '@/domain/events';
import {
  IPaymentRepository,
  IRefundRepository,
  IPaymentGateway,
  IEventBus,
  IAuditLogRepository,
  IAppointmentRepository,
  ICustomerProfileRepository,
  ISpecialistRepository,
  IRevenueRecordRepository,
} from '@/application/ports';
import { ProcessWebhookDto } from '@/application/dto';
import { AuditLog, RevenueRecord } from '@/domain/entities';
import { AuditAction, RevenueType } from '@/domain/enums';

export class ProcessWebhookUseCase {
  private readonly gateways: Record<string, IPaymentGateway>;

  constructor(
    private readonly paymentRepo: IPaymentRepository,
    _refundRepo: IRefundRepository,
    yookassaGateway: IPaymentGateway,
    robokassaGateway: IPaymentGateway,
    private readonly eventBus: IEventBus,
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly specialistRepo: ISpecialistRepository,
    private readonly revenueRepo: IRevenueRecordRepository,
  ) {
    this.gateways = {
      YOOKASSA: yookassaGateway,
      ROBOKASSA: robokassaGateway,
    };
  }

  async execute(dto: ProcessWebhookDto): Promise<void> {
    const gateway = this.gateways[dto.provider];
    if (!gateway) {
      throw new ValidationError(`Unknown payment provider: ${dto.provider}`);
    }

    const result = await gateway.verifyWebhook(dto.payload, dto.signature);

    // Distinguish between signature failure (attacker) and legitimate provider status events
    const isCanceled =
      !result.success &&
      (result.providerStatus === 'canceled' || result.providerStatus === 'failed');

    if (!result.success && !isCanceled) {
      throw new ValidationError('Webhook verification failed');
    }

    const payment = await this.paymentRepo.findByProviderPaymentId(
      result.providerPaymentId,
      dto.provider as PaymentProvider
    );

    if (!payment) {
      throw new NotFoundError('Payment', result.providerPaymentId);
    }

    // Idempotency: terminal payments are already fully processed
    if (payment.isTerminal) {
      return;
    }

    const oldStatus = payment.status;

    if (isCanceled) {
      payment.markCancelled();
      await this.paymentRepo.update(payment);

      await this.auditLogRepo.create(
        AuditLog.create({
          action: AuditAction.PAYMENT_PROCESSED,
          entityType: 'Payment',
          entityId: payment.id,
          oldValues: { status: oldStatus },
          newValues: { status: PaymentStatus.CANCELLED, providerStatus: result.providerStatus },
        })
      );

      await this.eventBus.publish(
        new PaymentFailedEvent(payment.id, {
          appointmentId: payment.appointmentId,
          amount: payment.amount.amount,
          reason: `Canceled by provider: ${result.providerStatus}`,
          failedAt: new Date().toISOString(),
        })
      );
      return;
    }

    // Validate amount matches what we recorded — prevent amount tampering from provider replay
    if (Math.abs(result.amount - payment.amount.amount) > 0.001) {
      throw new ValidationError(
        `Payment amount mismatch: expected ${payment.amount.amount}, got ${result.amount}`
      );
    }

    // Calculate commissions before the DB write so they're set in a single update
    let commission: Money | undefined;
    let specialistCommission: Money | undefined;
    let revenueRecord: RevenueRecord | undefined;

    const appointment = await this.appointmentRepo.findById(payment.appointmentId);
    if (appointment) {
      const specialist = await this.specialistRepo.findById(appointment.specialistId);
      if (specialist) {
        commission = specialist.calculateCommission(payment.amount);
        specialistCommission = payment.amount.percentage(specialist.commissionRate * 100);

        revenueRecord = new RevenueRecord({
          id: crypto.randomUUID(),
          date: new Date(),
          type: RevenueType.SERVICE_PAYMENT,
          amount: payment.amount,
          specialistId: specialist.id,
          paymentId: payment.id,
          appointmentId: appointment.id,
          createdAt: new Date(),
        });
      }
    }

    // Transition payment to CAPTURED and set commissions atomically in one DB write
    payment.markCaptured();
    if (commission && specialistCommission) {
      payment.setCommissions(commission, specialistCommission);
    }
    await this.paymentRepo.update(payment);

    // Create revenue record after payment is persisted
    if (revenueRecord) {
      await this.revenueRepo.create(revenueRecord);
    }

    // Update customer visit stats
    if (appointment) {
      await this.profileRepo.recordVisit(appointment.clientId, payment.amount.amount);
    }

    await this.eventBus.publish(
      new PaymentReceivedEvent(payment.id, {
        appointmentId: payment.appointmentId,
        amount: payment.amount.amount,
        currency: payment.amount.currency,
        provider: payment.provider,
        providerPaymentId: result.providerPaymentId,
        paidAt: new Date().toISOString(),
      })
    );

    await this.auditLogRepo.create(
      AuditLog.create({
        action: AuditAction.PAYMENT_PROCESSED,
        entityType: 'Payment',
        entityId: payment.id,
        oldValues: { status: oldStatus },
        newValues: {
          status: PaymentStatus.CAPTURED,
          providerPaymentId: result.providerPaymentId,
          commissionAmount: commission?.amount,
          specialistCommission: specialistCommission?.amount,
        },
      })
    );
  }
}
