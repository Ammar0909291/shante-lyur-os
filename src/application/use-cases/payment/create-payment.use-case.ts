import { Payment } from '@/domain/entities';
import { PaymentStatus, PaymentProvider } from '@/domain/enums';
import { Money } from '@/domain/value-objects';
import { NotFoundError, ConflictError } from '@/domain/errors';
import {
  IPaymentRepository,
  IAppointmentRepository,
  IPaymentGateway,
  IAuditLogRepository,
} from '@/application/ports';
import { CreatePaymentDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export interface CreatePaymentResult {
  payment: Payment;
  paymentUrl?: string;
}

export class CreatePaymentUseCase {
  private readonly gateways: Record<PaymentProvider, IPaymentGateway>;

  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    yookassaGateway: IPaymentGateway,
    robokassaGateway: IPaymentGateway,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {
    this.gateways = {
      [PaymentProvider.YOOKASSA]: yookassaGateway,
      [PaymentProvider.ROBOKASSA]: robokassaGateway,
      [PaymentProvider.CASH]: yookassaGateway, // No-op for cash
      [PaymentProvider.CARD_TERMINAL]: yookassaGateway,
      [PaymentProvider.TRANSFER]: yookassaGateway,
      [PaymentProvider.INTERNAL]: yookassaGateway,
    };
  }

  async execute(dto: CreatePaymentDto, actorId: string): Promise<CreatePaymentResult> {
    const appointment = await this.appointmentRepo.findById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment', dto.appointmentId);
    }

    if (appointment.isCancelled || appointment.isNoShow) {
      throw new ConflictError('Cannot create payment for cancelled or no-show appointment');
    }

    // Check for duplicate idempotency
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findByProviderPaymentId(dto.idempotencyKey, dto.provider as PaymentProvider);
      if (existing) {
        return { payment: existing };
      }
    }

    const amount = Money.create(dto.amount, dto.currency);

    const payment = new Payment({
      id: crypto.randomUUID(),
      appointmentId: dto.appointmentId,
      provider: dto.provider as PaymentProvider,
      amount,
      status: PaymentStatus.PENDING,
      description: dto.description,
      metadata: dto.metadata,
      idempotencyKey: dto.idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.paymentRepo.create(payment);

    let paymentUrl: string | undefined;

    // For online payments, initiate gateway flow
    if (dto.provider === PaymentProvider.YOOKASSA || dto.provider === PaymentProvider.ROBOKASSA) {
      const gateway = this.gateways[dto.provider];
      const result = await gateway.createPayment({
        amount,
        description: dto.description ?? `Payment for appointment ${dto.appointmentId}`,
        orderId: saved.id,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?paymentId=${saved.id}`,
        metadata: { appointmentId: dto.appointmentId, userId: appointment.clientId },
      });
      paymentUrl = result.paymentUrl;
      saved.markAuthorized(result.providerPaymentId);
      await this.paymentRepo.update(saved);
    }

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.PAYMENT_PROCESSED,
        entityType: 'Payment',
        entityId: saved.id,
        newValues: { status: 'PENDING', amount: saved.amount.amount, provider: saved.provider },
      })
    );

    return { payment: saved, paymentUrl };
  }
}
