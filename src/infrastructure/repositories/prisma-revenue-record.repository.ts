import { PrismaClient, Prisma } from '@prisma/client';
import { RevenueRecordRepositoryPort } from '@/application/ports/revenue-record-repository.port';
import { RevenueRecord } from '@/domain/entities/revenue-record.entity';
import { RevenueType } from '@/domain/enums/revenue-type.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaRevenueRecordRepository implements RevenueRecordRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; appointmentId: string | null; type: string; amount: number; specialistCommission: number | null; date: Date; notes: string | null; createdAt: Date }): RevenueRecord {
    return RevenueRecord.reconstitute({
      id: raw.id,
      appointmentId: raw.appointmentId ?? undefined,
      type: raw.type as RevenueType,
      amount: Money.create(raw.amount).getValue(),
      specialistCommission: raw.specialistCommission ? Money.create(raw.specialistCommission).getValue() : undefined,
      date: raw.date,
      notes: raw.notes ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<RevenueRecord | null> {
    const raw = await this.db.revenueRecord.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByDateRange(start: Date, end: Date, options?: { type?: RevenueType; specialistId?: string }): Promise<RevenueRecord[]> {
    const where: Prisma.RevenueRecordWhereInput = {
      date: { gte: start, lte: end },
    };
    if (options?.type) where.type = options.type;

    const raws = await this.db.revenueRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findDailyRevenue(date: Date): Promise<number> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const result = await this.db.revenueRecord.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async create(record: RevenueRecord): Promise<RevenueRecord> {
    const raw = await this.db.revenueRecord.create({
      data: {
        id: record.id,
        appointmentId: record.appointmentId,
        type: record.type,
        amount: record.amount,
        specialistCommission: record.specialistCommission,
        date: record.date,
        notes: record.notes,
      },
    });
    return this.toDomain(raw);
  }
}
