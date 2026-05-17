import { PrismaClient, Prisma } from '@prisma/client';
import { PaymentRepositoryPort } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; appointmentId: string; amount: number; currency: string; provider: string; providerPaymentId: string | null; status: string; paidAt: Date | null; refundedAmount: number; metadata: unknown | null; idempotencyKey: string | null; createdAt: Date; updatedAt: Date }): Payment {
    return Payment.reconstitute({
      id: raw.id,
      appointmentId: raw.appointmentId,
      amount: Money.create(raw.amount).getValue(),
      currency: raw.currency,
      provider: raw.provider as PaymentProvider,
      providerPaymentId: raw.providerPaymentId ?? undefined,
      status: raw.status as PaymentStatus,
      paidAt: raw.paidAt ?? undefined,
      refundedAmount: Money.create(raw.refundedAmount).getValue(),
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      idempotencyKey: raw.idempotencyKey ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Payment[]> {
    const raws = await this.db.payment.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findByProviderPaymentId(provider: PaymentProvider, providerPaymentId: string): Promise<Payment | null> {
    const raw = await this.db.payment.findFirst({
      where: { provider, providerPaymentId },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { idempotencyKey: key } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: { status?: PaymentStatus; provider?: PaymentProvider; from?: Date; to?: Date; page?: number; limit?: number }): Promise<{ items: Payment[]; total: number }> {
    const { status, provider, from, to, page = 1, limit = 20 } = options;
    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (from || to) where.createdAt = {};
    if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
    if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;

    const [raws, total] = await Promise.all([
      this.db.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.payment.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(payment: Payment): Promise<Payment> {
    const raw = await this.db.payment.create({
      data: {
        id: payment.id,
        appointmentId: payment.appointmentId,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        paidAt: payment.paidAt,
        refundedAmount: payment.refundedAmount,
        metadata: payment.metadata as Prisma.InputJsonValue,
        idempotencyKey: payment.idempotencyKey,
      },
    });
    return this.toDomain(raw);
  }

  async update(payment: Payment): Promise<Payment> {
    const raw = await this.db.payment.update({
      where: { id: payment.id },
      data: {
        status: payment.status,
        paidAt: payment.paidAt,
        refundedAmount: payment.refundedAmount,
        providerPaymentId: payment.providerPaymentId,
        metadata: payment.metadata as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }
}
