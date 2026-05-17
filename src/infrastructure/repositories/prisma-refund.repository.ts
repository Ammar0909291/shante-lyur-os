import { PrismaClient } from '@prisma/client';
import { RefundRepositoryPort } from '@/application/ports/refund-repository.port';
import { Refund } from '@/domain/entities/refund.entity';
import { RefundStatus } from '@/domain/enums/refund-status.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaRefundRepository implements RefundRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; paymentId: string; amount: number; reason: string | null; status: string; processedAt: Date | null; processedBy: string | null; createdAt: Date; updatedAt: Date }): Refund {
    return Refund.reconstitute({
      id: raw.id,
      paymentId: raw.paymentId,
      amount: Money.create(raw.amount).getValue(),
      reason: raw.reason ?? undefined,
      status: raw.status as RefundStatus,
      processedAt: raw.processedAt ?? undefined,
      processedBy: raw.processedBy ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
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

  async create(refund: Refund): Promise<Refund> {
    const raw = await this.db.refund.create({
      data: {
        id: refund.id,
        paymentId: refund.paymentId,
        amount: refund.amount,
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
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status,
        processedAt: refund.processedAt,
        processedBy: refund.processedBy,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }
}
