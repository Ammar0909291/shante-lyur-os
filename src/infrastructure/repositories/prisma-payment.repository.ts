import { PrismaClient, Prisma } from '@prisma/client';
import { IPaymentRepository } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';

type RawPayment = {
  id: string;
  appointmentId: string;
  provider: string;
  providerPaymentId: string | null;
  amount: number | { toNumber(): number };
  currency: string;
  status: string;
  description: string | null;
  metadata: unknown;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  idempotencyKey: string | null;
  commissionAmount: number | { toNumber(): number } | null;
  specialistCommission: number | { toNumber(): number } | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: number | { toNumber(): number }): number {
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawPayment): Payment {
    return new Payment({
      id: raw.id,
      appointmentId: raw.appointmentId,
      provider: raw.provider as PaymentProvider,
      providerPaymentId: raw.providerPaymentId ?? undefined,
      amount: Money.create(this.toNum(raw.amount), raw.currency),
      status: raw.status as PaymentStatus,
      description: raw.description ?? undefined,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      paidAt: raw.paidAt ?? undefined,
      failedAt: raw.failedAt ?? undefined,
      failureReason: raw.failureReason ?? undefined,
      idempotencyKey: raw.idempotencyKey ?? undefined,
      commissionAmount: raw.commissionAmount != null ? Money.create(this.toNum(raw.commissionAmount as number | { toNumber(): number }), raw.currency) : undefined,
      specialistCommission: raw.specialistCommission != null ? Money.create(this.toNum(raw.specialistCommission as number | { toNumber(): number }), raw.currency) : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawPayment) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Payment[]> {
    const raws = await this.db.payment.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawPayment));
  }

  async findByProviderPaymentId(providerId: string, provider: PaymentProvider): Promise<Payment | null> {
    const raw = await this.db.payment.findFirst({
      where: { provider, providerPaymentId: providerId },
    });
    return raw ? this.toDomain(raw as unknown as RawPayment) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const raw = await this.db.payment.findUnique({ where: { idempotencyKey: key } });
    return raw ? this.toDomain(raw as unknown as RawPayment) : null;
  }

  async findMany(options: { status?: PaymentStatus; provider?: PaymentProvider; from?: Date; to?: Date; page?: number; limit?: number }): Promise<{ items: Payment[]; total: number }> {
    const { status, provider, from, to, page = 1, limit = 20 } = options;
    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;
    }

    const [raws, total] = await Promise.all([
      this.db.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.payment.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawPayment)), total };
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
        metadata: payment.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
        paidAt: payment.paidAt,
        failedAt: payment.failedAt,
        failureReason: payment.failureReason,
        idempotencyKey: payment.idempotencyKey,
      },
    });
    return this.toDomain(raw as unknown as RawPayment);
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
        metadata: payment.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
        commissionAmount: payment.commissionAmount?.amount,
        specialistCommission: payment.specialistCommission?.amount,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as unknown as RawPayment);
  }

  async getRevenueSummary(from: Date, to: Date): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    byProvider: Record<string, number>;
  }> {
    const [capturedPayments, refunds] = await Promise.all([
      this.db.payment.findMany({
        where: { status: { in: [PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.FULLY_REFUNDED] }, paidAt: { gte: from, lte: to } },
      }),
      this.db.refund.findMany({
        where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      }),
    ]);

    const totalRevenue = capturedPayments.reduce((sum, p) => sum + this.toNum(p.amount as unknown as number | { toNumber(): number }), 0);
    const totalRefunds = refunds.reduce((sum, r) => sum + this.toNum(r.amount as unknown as number | { toNumber(): number }), 0);
    const netRevenue = totalRevenue - totalRefunds;

    const byProvider: Record<string, number> = {};
    for (const p of capturedPayments) {
      const amt = this.toNum(p.amount as unknown as number | { toNumber(): number });
      byProvider[p.provider] = (byProvider[p.provider] ?? 0) + amt;
    }

    return { totalRevenue, totalRefunds, netRevenue, byProvider };
  }
}
