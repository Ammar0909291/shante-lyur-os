import { PrismaClient, Prisma } from '@prisma/client';
import { IRefundRepository } from '@/application/ports/refund-repository.port';
import { Refund } from '@/domain/entities/refund.entity';
import { RefundStatus } from '@/domain/enums/refund-status.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaRefundRepository implements IRefundRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string; paymentId: string; providerRefundId: string | null;
    amount: { toNumber(): number }; reason: string | null; status: unknown;
    processedAt: Date | null; processedBy: string | null; createdAt: Date;
  }): Refund {
    return new Refund({
      id: raw.id,
      paymentId: raw.paymentId,
      providerRefundId: raw.providerRefundId ?? undefined,
      amount: Money.create(raw.amount.toNumber()),
      reason: raw.reason ?? undefined,
      status: raw.status as RefundStatus,
      processedAt: raw.processedAt ?? undefined,
      processedBy: raw.processedBy ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<Refund | null> {
    const raw = await this.db.refund.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByPaymentId(paymentId: string): Promise<Refund[]> {
    const raws = await this.db.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findMany(options: { status?: RefundStatus; from?: Date; to?: Date; page?: number; limit?: number }): Promise<{ items: Refund[]; total: number }> {
    const { status, from, to, page = 1, limit = 20 } = options;
    const where: Prisma.RefundWhereInput = {};
    if (status) where.status = status;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const [raws, total] = await Promise.all([
      this.db.refund.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.refund.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(refund: Refund): Promise<Refund> {
    const raw = await this.db.refund.create({
      data: {
        id: refund.id,
        paymentId: refund.paymentId,
        providerRefundId: refund.providerRefundId,
        amount: refund.amount.amount,
        reason: refund.reason,
        status: refund.status,
        processedAt: refund.processedAt,
        processedBy: refund.processedBy,
      },
    });
    return this.toDomain(raw);
  }

  async update(refund: Refund): Promise<Refund> {
    const raw = await this.db.refund.update({
      where: { id: refund.id },
      data: {
        providerRefundId: refund.providerRefundId,
        amount: refund.amount.amount,
        reason: refund.reason,
        status: refund.status,
        processedAt: refund.processedAt,
        processedBy: refund.processedBy,
      },
    });
    return this.toDomain(raw);
  }
}
