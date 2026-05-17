import {
  PrismaClient,
  Prisma,
  PaymentStatus as PrismaPaymentStatus,
  PaymentProvider as PrismaPaymentProvider,
} from '@prisma/client';
import { IPaymentRepository } from '@/application/ports/payment-repository.port';
import { Payment } from '@/domain/entities/payment.entity';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    appointmentId: string;
    provider: PrismaPaymentProvider;
    providerPaymentId: string | null;
    amount: Prisma.Decimal | number;
    currency: string;
    status: PrismaPaymentStatus;
    description?: string | null;
    metadata: Prisma.JsonValue | null;
    paidAt: Date | null;
    failedAt?: Date | null;
    failureReason?: string | null;
    idempotencyKey: string | null;
    commissionAmount?: Prisma.Decimal | number | null;
    specialistCommission?: Prisma.Decimal | number | null;
    createdAt: Date;
    updatedAt: Date;
  }): Payment {
    const toNum = (v: Prisma.Decimal | number | null | undefined): number | undefined => {
      if (v === null || v === undefined) return undefined;
      return typeof v === 'number' ? v : v.toNumber();
    };

    return new Payment({
      id: raw.id,
      appointmentId: raw.appointmentId,
      provider: raw.provider as unknown as PaymentProvider,
      providerPaymentId: raw.providerPaymentId ?? undefined,
      amount: Money.create(toNum(raw.amount) ?? 0),
      status: raw.status as unknown as PaymentStatus,
      description: raw.description ?? undefined,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      paidAt: raw.paidAt ?? undefined,
      failedAt: raw.failedAt ?? undefined,
      failureReason: raw.failureReason ?? undefined,
      idempotencyKey: raw.idempotencyKey ?? undefined,
      commissionAmount: toNum(raw.commissionAmount) !== undefined ? Money.create(toNum(raw.commissionAmount)!) : undefined,
      specialistCommission: toNum(raw.specialistCommission) !== undefined ? Money.create(toNum(raw.specialistCommission)!) : undefined,
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
      where: {
        providerPaymentId: providerId,
        provider: provider as unknown as PrismaPaymentProvider,
      },
    });
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
    if (status) where.status = status as unknown as PrismaPaymentStatus;
    if (provider) where.provider = provider as unknown as PrismaPaymentProvider;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;
    }

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
        amount: payment.amount.amount,
        provider: payment.provider as unknown as PrismaPaymentProvider,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status as unknown as PrismaPaymentStatus,
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
        status: payment.status as unknown as PrismaPaymentStatus,
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
    return this.toDomain(raw);
  }

  async getRevenueSummary(from: Date, to: Date): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    byProvider: Record<string, number>;
  }> {
    const capturedStatuses: PrismaPaymentStatus[] = [
      PaymentStatus.CAPTURED as unknown as PrismaPaymentStatus,
      PaymentStatus.PARTIALLY_REFUNDED as unknown as PrismaPaymentStatus,
      PaymentStatus.FULLY_REFUNDED as unknown as PrismaPaymentStatus,
    ];

    const payments = await this.db.payment.findMany({
      where: {
        status: { in: capturedStatuses },
        createdAt: { gte: from, lte: to },
      },
      select: {
        provider: true,
        amount: true,
        status: true,
      },
    });

    let totalRevenue = 0;
    let totalRefunds = 0;
    const byProvider: Record<string, number> = {};

    for (const p of payments) {
      const amt = typeof p.amount === 'number' ? p.amount : (p.amount as Prisma.Decimal).toNumber();
      const provider = p.provider as string;

      if ((p.status as string) === PaymentStatus.FULLY_REFUNDED) {
        totalRefunds += amt;
      } else {
        totalRevenue += amt;
        byProvider[provider] = (byProvider[provider] ?? 0) + amt;
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
