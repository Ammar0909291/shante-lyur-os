import { AppointmentStatus, UserRole } from '@/domain/enums';
import { NotFoundError, ForbiddenError, ConflictError } from '@/domain/errors';
import { Money } from '@/domain/value-objects';
import {
  IAppointmentRepository,
  IPaymentRepository,
  IRefundRepository,
  IPromoCodeRepository,
  IAuditLogRepository,
  IPaymentGateway,
} from '@/application/ports';
import { CancelAppointmentDto } from '@/application/dto';
import { AuditLog, Refund } from '@/domain/entities';
import { AuditAction, RefundStatus } from '@/domain/enums';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly paymentRepo: IPaymentRepository,
    private readonly refundRepo: IRefundRepository,
    private readonly promoCodeRepo: IPromoCodeRepository,
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly yookassaGateway: IPaymentGateway,
    private readonly robokassaGateway: IPaymentGateway,
  ) {}

  async execute(
    appointmentId: string,
    dto: CancelAppointmentDto,
    actorId: string,
    actorRole: UserRole
  ) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment', appointmentId);
    }

    // Authorization
    if (actorRole === UserRole.CLIENT && appointment.clientId !== actorId) {
      throw new ForbiddenError();
    }

    if (!appointment.isModifiable) {
      throw new ConflictError('Cannot cancel appointment in current status');
    }

    // Cancellation policy: 24h before = full refund, less = partial or none
    const hoursBefore = (appointment.startAt.getTime() - Date.now()) / 3600000;
    let refundPolicy: 'full' | 'partial' | 'none' = 'full';
    if (hoursBefore < 2) {
      refundPolicy = 'none';
    } else if (hoursBefore < 24) {
      refundPolicy = 'partial';
    }

    // If admin/operator cancels, always full refund
    if ([UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPER_ADMIN].includes(actorRole)) {
      refundPolicy = 'full';
    }

    appointment.cancel(dto.reason, actorId);
    const saved = await this.appointmentRepo.update(appointment);

    // Process refunds if applicable
    const payments = await this.paymentRepo.findByAppointmentId(appointmentId);
    const successfulPayments = payments.filter(p => p.isSuccessful);

    for (const payment of successfulPayments) {
      let refundAmount: Money;
      if (refundPolicy === 'full') {
        refundAmount = payment.amount;
      } else if (refundPolicy === 'partial') {
        refundAmount = payment.amount.percentage(50);
      } else {
        continue;
      }

      const refund = new Refund({
        id: crypto.randomUUID(),
        paymentId: payment.id,
        amount: refundAmount,
        reason: dto.reason,
        status: RefundStatus.PENDING,
        createdAt: new Date(),
      });

      await this.refundRepo.create(refund);

      // Trigger gateway refund
      const gateway = payment.provider === 'YOOKASSA'
        ? this.yookassaGateway
        : payment.provider === 'ROBOKASSA'
        ? this.robokassaGateway
        : null;

      if (gateway && payment.providerPaymentId) {
        try {
          const result = await gateway.refund({
            providerPaymentId: payment.providerPaymentId,
            amount: refundAmount,
            reason: dto.reason,
          });
          if (result.success) {
            refund.markProcessing();
            await this.refundRepo.update(refund);
          }
        } catch {
          refund.markFailed();
          await this.refundRepo.update(refund);
        }
      }
    }

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        appointmentId: appointment.id,
        action: AuditAction.UPDATE,
        entityType: 'Appointment',
        entityId: appointment.id,
        oldValues: { status: appointment.status },
        newValues: { status: 'CANCELLED', reason: dto.reason },
      })
    );

    return { appointment: saved, refundPolicy, refundsProcessed: successfulPayments.length };
  }
}
