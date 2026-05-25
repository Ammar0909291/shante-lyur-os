import { NotFoundError, ValidationError } from '@/domain/errors';
import { PaymentReceivedEvent } from '@/domain/events';
import {
  IPaymentRepository,
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
import { AuditAction, RevenueType, PaymentProvider } from '@/domain/enums';
import { prisma } from '@/infrastructure/config/prisma-client';

export class ProcessWebhookUseCase {
  private readonly gateways: Record<string, IPaymentGateway>;

  constructor(
    private readonly paymentRepo: IPaymentRepository,
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
    if (!result.success) {
      throw new ValidationError('Webhook verification failed');
    }

    const payment = await this.paymentRepo.findByProviderPaymentId(
      result.providerPaymentId,
      dto.provider as PaymentProvider
    );
    if (!payment) {
      throw new NotFoundError('Payment', result.providerPaymentId);
    }

    if (payment.isTerminal) {
      return;
    }

    const oldStatus = payment.status;

    if (result.amount !== payment.amount.amount) {
      throw new ValidationError('Payment amount mismatch');
    }

    payment.markCaptured();
    await this.paymentRepo.update(payment);

    const appointment = await this.appointmentRepo.findById(payment.appointmentId);
    if (appointment) {
      const specialist = await this.specialistRepo.findById(appointment.specialistId);
      if (specialist) {
        const commission = specialist.calculateCommission(payment.amount);
        const specialistCommission = payment.amount.percentage(specialist.commissionRate * 100);
        payment.setCommissions(commission, specialistCommission);
        await this.paymentRepo.update(payment);

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

        await this.profileRepo.recordVisit(appointment.clientId, payment.amount.amount);

        // Auto-write commission PayrollEntry (idempotent: skip if already exists)
        const existingCommission = await prisma.payrollEntry.findFirst({
          where: { paymentId: payment.id, type: 'COMMISSION' },
          select: { id: true },
        });
        if (!existingCommission) {
          const [paymentRow, salaryConfig] = await Promise.all([
            prisma.payment.findUnique({
              where: { id: payment.id },
              select: { commissionRate: true },
            }),
            prisma.specialistSalaryConfig.findUnique({
              where: { specialistId: appointment.specialistId },
              select: { commissionRate: true },
            }),
          ]);
          // Priority: payment.commissionRate override → salaryConfig.commissionRate → specialist.commissionRate
          const rate =
            (paymentRow?.commissionRate != null ? Number(paymentRow.commissionRate) : null) ??
            (salaryConfig?.commissionRate != null ? Number(salaryConfig.commissionRate) : null) ??
            specialist.commissionRate;
          const rateNum = Number(rate);
          const commissionAmount = Math.round(Number(payment.amount.amount) * rateNum * 100) / 100;
          const paidAt = payment.paidAt ?? new Date();
          const periodMonth = paidAt.toISOString().substring(0, 7);

          await prisma.payrollEntry.create({
            data: {
              specialistId: appointment.specialistId,
              paymentId: payment.id,
              appointmentId: payment.appointmentId,
              type: 'COMMISSION',
              amount: commissionAmount,
              rate: rateNum,
              periodMonth,
              description: 'Комиссия с продажи',
              isLocked: false,
            },
          });
        }
      }
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
        newValues: { status: 'CAPTURED', providerPaymentId: result.providerPaymentId },
      })
    );
  }
}
