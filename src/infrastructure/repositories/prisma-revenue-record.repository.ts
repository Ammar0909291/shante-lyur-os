import { PrismaClient, Prisma } from '@prisma/client';
import { RevenueRecordRepositoryPort } from '@/application/ports/revenue-record-repository.port';
import { RevenueRecord } from '@/domain/entities/revenue-record.entity';
import { RevenueType } from '@/domain/enums/revenue-type.enum';
import { Money } from '@/domain/value-objects/money.vo';

type RawRevenueRecord = {
  id: string;
  appointmentId: string | null;
  specialistId: string | null;
  serviceId: string | null;
  paymentId: string | null;
  locationId: string | null;
  type: string;
  amount: number | { toNumber(): number };
  date: Date;
  notes: string | null;
  createdAt: Date;
};

export class PrismaRevenueRecordRepository implements RevenueRecordRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: number | { toNumber(): number }): number {
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawRevenueRecord): RevenueRecord {
    return new RevenueRecord({
      id: raw.id,
      appointmentId: raw.appointmentId ?? undefined,
      specialistId: raw.specialistId ?? undefined,
      serviceId: raw.serviceId ?? undefined,
      paymentId: raw.paymentId ?? undefined,
      locationId: raw.locationId ?? undefined,
      type: raw.type as RevenueType,
      amount: Money.create(this.toNum(raw.amount)),
      date: raw.date,
      notes: raw.notes ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<RevenueRecord | null> {
    const raw = await this.db.revenueRecord.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawRevenueRecord) : null;
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
    const { from, to, type, specialistId, locationId, page = 1, limit = 20 } = options;
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
      this.db.revenueRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.db.revenueRecord.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawRevenueRecord)), total };
  }

  async findByDateRange(start: Date, end: Date, options?: { type?: RevenueType; specialistId?: string }): Promise<RevenueRecord[]> {
    const where: Prisma.RevenueRecordWhereInput = {
      date: { gte: start, lte: end },
    };
    if (options?.type) where.type = options.type;
    if (options?.specialistId) where.specialistId = options.specialistId;

    const raws = await this.db.revenueRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawRevenueRecord));
  }

  async create(record: RevenueRecord): Promise<RevenueRecord> {
    const raw = await this.db.revenueRecord.create({
      data: {
        id: record.id,
        appointmentId: record.appointmentId,
        specialistId: record.specialistId,
        serviceId: record.serviceId,
        paymentId: record.paymentId,
        locationId: record.locationId,
        type: record.type,
        amount: record.amount.amount,
        date: record.date,
        notes: record.notes,
      },
    });
    return this.toDomain(raw as unknown as RawRevenueRecord);
  }

  async getDailyRevenue(date: Date): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const result = await this.db.revenueRecord.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const sum = result._sum.amount;
    return sum ? this.toNum(sum as unknown as number | { toNumber(): number }) : 0;
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const result = await this.db.revenueRecord.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const sum = result._sum.amount;
    return sum ? this.toNum(sum as unknown as number | { toNumber(): number }) : 0;
  }

  async getSpecialistRevenue(specialistId: string, from: Date, to: Date): Promise<number> {
    const result = await this.db.revenueRecord.aggregate({
      where: { specialistId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    const sum = result._sum.amount;
    return sum ? this.toNum(sum as unknown as number | { toNumber(): number }) : 0;
  }
}
