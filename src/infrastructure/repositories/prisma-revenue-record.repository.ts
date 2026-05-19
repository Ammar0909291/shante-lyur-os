import { PrismaClient, Prisma } from '@prisma/client';
import { RevenueRecordRepositoryPort } from '@/application/ports/revenue-record-repository.port';
import { RevenueRecord } from '@/domain/entities/revenue-record.entity';
import { RevenueType } from '@/domain/enums/revenue-type.enum';
import { Money } from '@/domain/value-objects/money.vo';

type PrismaRevenueRecord = {
  id: string;
  date: Date;
  type: string;
  amount: Prisma.Decimal;
  specialistId: string | null;
  serviceId: string | null;
  paymentId: string | null;
  appointmentId: string | null;
  locationId: string | null;
  notes: string | null;
  createdAt: Date;
};

export class PrismaRevenueRecordRepository implements RevenueRecordRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaRevenueRecord): RevenueRecord {
    return new RevenueRecord({
      id: raw.id,
      date: raw.date,
      type: raw.type as RevenueType,
      amount: Money.create(Number(raw.amount)),
      specialistId: raw.specialistId ?? undefined,
      serviceId: raw.serviceId ?? undefined,
      paymentId: raw.paymentId ?? undefined,
      appointmentId: raw.appointmentId ?? undefined,
      locationId: raw.locationId ?? undefined,
      notes: raw.notes ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<RevenueRecord | null> {
    const raw = await this.db.revenueRecord.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: {
    from?: Date;
    to?: Date;
    type?: RevenueType;
    specialistId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: RevenueRecord[]; total: number }> {
    const { from, to, type, specialistId, locationId, page = 1, limit = 50 } = options;
    const where: Prisma.RevenueRecordWhereInput = {};
    if (from || to) {
      where.date = {};
      if (from) (where.date as Prisma.DateTimeFilter).gte = from;
      if (to) (where.date as Prisma.DateTimeFilter).lte = to;
    }
    if (type) where.type = type;
    if (specialistId) where.specialistId = specialistId;
    if (locationId) where.locationId = locationId;

    const [raws, total] = await Promise.all([
      this.db.revenueRecord.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { date: 'desc' } }),
      this.db.revenueRecord.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(record: RevenueRecord): Promise<RevenueRecord> {
    const raw = await this.db.revenueRecord.create({
      data: {
        id: record.id,
        date: record.date,
        type: record.type,
        amount: record.amount.amount,
        specialistId: record.specialistId,
        serviceId: record.serviceId,
        paymentId: record.paymentId,
        appointmentId: record.appointmentId,
        locationId: record.locationId,
        notes: record.notes,
      },
    });
    return this.toDomain(raw);
  }

  async getDailyRevenue(date: Date): Promise<number> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const result = await this.db.revenueRecord.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const result = await this.db.revenueRecord.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async getSpecialistRevenue(specialistId: string, from: Date, to: Date): Promise<number> {
    const result = await this.db.revenueRecord.aggregate({
      where: { specialistId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }
}
