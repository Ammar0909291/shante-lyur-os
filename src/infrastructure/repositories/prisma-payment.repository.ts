import { PrismaClient, Prisma } from '@prisma/client';
import { PaymentRepositoryPort } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(raw: any): Payment {
    return Payment.reconstitute({
      id: raw.id,
      appointmentId: raw.appointmentId,
      provider: raw.provider as PaymentProvider,
      providerPaymentId: raw.providerPaymentId ?? undefined,
      amount: Money.create(raw.amount.toNumber(), raw.currency),
      status: raw.status as PaymentStatus,
      description: raw.description ?? undefined,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      paidAt: raw.paidAt ?? undefined,
      failedAt: raw.failedAt ?? undefined,
      failureReason: raw.failureReason ?? undefined,
      idempotencyKey: raw.idempotencyKey ?? undefined,
      commissionAmount: raw.commissionAmount ? Money.create(raw.commissionAmount.toNumber(), raw.currency) : undefined,
      specialistCommission: raw.specialistCommission ? Money.create(raw.specialistCommission.toNumber(), raw.currency) : undefined,
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

  async findByProviderPaymentId(providerId: string, provider: PaymentProvider): Promise<Payment | null> {
    const raw = await this.db.payment.findFirst({
      where: { providerPaymentId: providerId, provider },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { idempotencyKey: key } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: {
    status?: PaymentStatus;
    provider?: PaymentProvider;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: Payment[]; total: number }> {
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
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        amount: payment.amount.amount,
        currency: payment.amount.currency,
        status: payment.status,
        description: payment.description,
        metadata: payment.metadata as Prisma.InputJsonValue,
        paidAt: payment.paidAt,
        failedAt: payment.failedAt,
        failureReason: payment.failureReason,
        idempotencyKey: payment.idempotencyKey,
        commissionAmount: payment.commissionAmount?.amount,
        specialistCommission: payment.specialistCommission?.amount,
      },
    });
    return this.toDomain(raw);
  }

  async update(payment: Payment): Promise<Payment> {
    const raw = await this.db.payment.update({
      where: { id: payment.id },
      data: {
        status: payment.status,
        providerPaymentId: payment.providerPaymentId,
        paidAt: payment.paidAt,
        failedAt: payment.failedAt,
        failureReason: payment.failureReason,
        metadata: payment.metadata as Prisma.InputJsonValue,
        commissionAmount: payment.commissionAmount?.amount,
        specialistCommission: payment.specialistCommission?.amount,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async getRevenueSummary(from: Date, to: Date): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    byProvider: Record<string, number>;
  }> {
    const [payments, refunds] = await Promise.all([
      this.db.payment.findMany({
        where: {
          paidAt: { gte: from, lte: to },
          status: PaymentStatus.CAPTURED,
        },
        select: { amount: true, provider: true },
      }),
      this.db.refund.aggregate({
        where: {
          processedAt: { gte: from, lte: to },
          status: 'COMPLETED' as never,
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount as unknown as { toNumber(): number }).toNumber(), 0);
    const totalRefunds = refunds._sum.amount ? (refunds._sum.amount as unknown as { toNumber(): number }).toNumber() : 0;

    const byProvider: Record<string, number> = {};
    for (const p of payments) {
      const amt = (p.amount as unknown as { toNumber(): number }).toNumber();
      byProvider[p.provider] = (byProvider[p.provider] ?? 0) + amt;
    }

    return {
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      byProvider,
    };
  }
}
