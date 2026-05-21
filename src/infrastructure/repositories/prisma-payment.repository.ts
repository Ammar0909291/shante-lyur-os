import { PrismaClient, Prisma } from '@prisma/client';
import { IPaymentRepository } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';

type PrismaPayment = {
  id: string;
  appointmentId: string;
  amount: { toNumber(): number };
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  description: string | null;
  metadata: unknown | null;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  idempotencyKey: string | null;
  commissionAmount: { toNumber(): number } | null;
  specialistCommission: { toNumber(): number } | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaPayment): Payment {
    const payment = Payment.reconstitute({
      id: raw.id,
      appointmentId: raw.appointmentId,
      amount: Money.create(raw.amount.toNumber(), raw.currency),
      provider: raw.provider as PaymentProvider,
      providerPaymentId: raw.providerPaymentId ?? undefined,
      status: raw.status as PaymentStatus,
      description: raw.description ?? undefined,
      paidAt: raw.paidAt ?? undefined,
      failedAt: raw.failedAt ?? undefined,
      failureReason: raw.failureReason ?? undefined,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      idempotencyKey: raw.idempotencyKey ?? undefined,
      commissionAmount: raw.commissionAmount
        ? Money.create(raw.commissionAmount.toNumber(), raw.currency)
        : undefined,
      specialistCommission: raw.specialistCommission
        ? Money.create(raw.specialistCommission.toNumber(), raw.currency)
        : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
    return payment;
  }

  async findById(id: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as PrismaPayment) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Payment[]> {
    const raws = await this.db.payment.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r as PrismaPayment));
  }

  async findByProviderPaymentId(providerId: string, provider: PaymentProvider): Promise<Payment | null> {
    const raw = await this.db.payment.findFirst({
      where: { provider, providerPaymentId: providerId },
    });
    return raw ? this.toDomain(raw as PrismaPayment) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { idempotencyKey: key } });
    return raw ? this.toDomain(raw as PrismaPayment) : null;
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
    return { items: raws.map(r => this.toDomain(r as PrismaPayment)), total };
  }

  async create(payment: Payment): Promise<Payment> {
    const raw = await this.db.payment.create({
      data: {
        id: payment.id,
        appointmentId: payment.appointmentId,
        amount: payment.amount.amount,
        currency: payment.amount.currency,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        description: payment.description,
        paidAt: payment.paidAt,
        metadata: payment.metadata as Prisma.InputJsonValue,
        idempotencyKey: payment.idempotencyKey,
        commissionAmount: payment.commissionAmount?.amount,
        specialistCommission: payment.specialistCommission?.amount,
      },
    });
    return this.toDomain(raw as PrismaPayment);
  }

  async update(payment: Payment): Promise<Payment> {
    const raw = await this.db.payment.update({
      where: { id: payment.id },
      data: {
        status: payment.status,
        paidAt: payment.paidAt,
        failedAt: payment.failedAt,
        failureReason: payment.failureReason,
        providerPaymentId: payment.providerPaymentId,
        metadata: payment.metadata as Prisma.InputJsonValue,
        commissionAmount: payment.commissionAmount?.amount,
        specialistCommission: payment.specialistCommission?.amount,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as PrismaPayment);
  }

  async getRevenueSummary(from: Date, to: Date): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    byProvider: Record<string, number>;
  }> {
    const payments = await this.db.payment.findMany({
      where: {
        status: { in: [PaymentStatus.CAPTURED, PaymentStatus.FULLY_REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] },
        paidAt: { gte: from, lte: to },
      },
      select: { amount: true, provider: true, refunds: { select: { amount: true } } },
    });

    let totalRevenue = 0;
    let totalRefunds = 0;
    const byProvider: Record<string, number> = {};

    for (const p of payments) {
      const amt = (p.amount as { toNumber(): number }).toNumber();
      totalRevenue += amt;
      byProvider[p.provider] = (byProvider[p.provider] ?? 0) + amt;
      for (const r of p.refunds) {
        totalRefunds += (r.amount as { toNumber(): number }).toNumber();
      }
    }

    return {
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      byProvider,
    };
  }
}
