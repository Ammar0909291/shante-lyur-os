import { PaymentStatus, RefundStatus } from '@/domain/enums';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { Money } from '@/domain/value-objects';
import {
  IPaymentRepository,
  IRefundRepository,
  IPaymentGateway,
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
    private readonly refundRepo: IRefundRepository,
    private readonly yookassaGateway: IPaymentGateway,
    private readonly robokassaGateway: IPaymentGateway,
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
    if (!result.success) {
      throw new ValidationError('Webhook verification failed');
    }

    const payment = await this.paymentRepo.findByProviderPaymentId(
      result.providerPaymentId,
      dto.provider as any
    );
    if (!payment) {
      throw new NotFoundError('Payment', result.providerPaymentId);
    }

    if (payment.isTerminal) {
      return; // Already processed
    }

    const oldStatus = payment.status;

    if (result.amount !== payment.amount.amount) {
      throw new ValidationError('Payment amount mismatch');
    }

    payment.markCaptured();
    await this.paymentRepo.update(payment);

    // Calculate commissions
    const appointment = await this.appointmentRepo.findById(payment.appointmentId);
    if (appointment) {
      const specialist = await this.specialistRepo.findById(appointment.specialistId);
      if (specialist) {
        const commission = specialist.calculateCommission(payment.amount);
        const specialistCommission = payment.amount.percentage(specialist.commissionRate * 100);
        payment.setCommissions(commission, specialistCommission);
        await this.paymentRepo.update(payment);

        // Record revenue
        const revenue = new RevenueRecord({
          id: crypto.randomUUID(),
          date: new Date(),
          type: RevenueType.SERVICE_PAYMENT,
          amount: payment.amount,
          specialistId: specialist.id,
          paymentId: payment.id,
          appointmentId: appointment.id,
          createdAt: new Date(),
        });
        await this.revenueRepo.create(revenue);

        // Update customer profile
        await this.profileRepo.recordVisit(appointment.clientId, payment.amount.amount);
      }
    }

    await this.auditLogRepo.create(
      AuditLog.create({
        action: AuditAction.PAYMENT_PROCESSED,
        entityType: 'Payment',
        entityId: payment.id,
        oldValues: { status: oldStatus },
        newValues: { status: 'CAPTURED', providerPaymentId: result.providerPaymentId },
      })
    );
  }
}
