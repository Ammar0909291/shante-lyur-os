import { PrismaClient } from '@prisma/client';
import { IDailyMetricsRepository } from '@/application/ports/daily-metrics-repository.port';
import { DailyMetrics } from '@/domain/entities/daily-metrics.entity';
import { Money } from '@/domain/value-objects/money.vo';

type RawDailyMetrics = {
  id: string;
  date: Date;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number | { toNumber(): number };
  totalRefunds: number | { toNumber(): number };
  newCustomers: number;
  returningCustomers: number;
  avgAppointmentValue: number | { toNumber(): number } | null;
  avgBookingLeadTime: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaDailyMetricsRepository implements IDailyMetricsRepository {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: number | { toNumber(): number }): number {
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawDailyMetrics): DailyMetrics {
    return new DailyMetrics({
      id: raw.id,
      date: raw.date,
      totalAppointments: raw.totalAppointments,
      completedAppointments: raw.completedAppointments,
      cancelledAppointments: raw.cancelledAppointments,
      noShowAppointments: raw.noShowAppointments,
      totalRevenue: Money.create(this.toNum(raw.totalRevenue)),
      totalRefunds: Money.create(this.toNum(raw.totalRefunds)),
      newCustomers: raw.newCustomers,
      returningCustomers: raw.returningCustomers,
      avgAppointmentValue: raw.avgAppointmentValue != null ? Money.create(this.toNum(raw.avgAppointmentValue as number | { toNumber(): number })) : undefined,
      avgBookingLeadTime: raw.avgBookingLeadTime ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByDate(date: Date): Promise<DailyMetrics | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const raw = await this.db.dailyMetrics.findFirst({ where: { date: { gte: start } } });
    return raw ? this.toDomain(raw as unknown as RawDailyMetrics) : null;
  }

  async findRange(from: Date, to: Date): Promise<DailyMetrics[]> {
    const raws = await this.db.dailyMetrics.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawDailyMetrics));
  }

  async create(metrics: DailyMetrics): Promise<DailyMetrics> {
    const raw = await this.db.dailyMetrics.create({
      data: {
        id: metrics.id,
        date: metrics.date,
        totalAppointments: metrics.totalAppointments,
        completedAppointments: metrics.completedAppointments,
        cancelledAppointments: metrics.cancelledAppointments,
        noShowAppointments: metrics.noShowAppointments,
        totalRevenue: metrics.totalRevenue.amount,
        totalRefunds: metrics.totalRefunds.amount,
        newCustomers: metrics.newCustomers,
        returningCustomers: metrics.returningCustomers,
        avgAppointmentValue: metrics.avgAppointmentValue?.amount,
        avgBookingLeadTime: metrics.avgBookingLeadTime,
      },
    });
    return this.toDomain(raw as unknown as RawDailyMetrics);
  }

  async update(metrics: DailyMetrics): Promise<DailyMetrics> {
    const raw = await this.db.dailyMetrics.update({
      where: { id: metrics.id },
      data: {
        totalAppointments: metrics.totalAppointments,
        completedAppointments: metrics.completedAppointments,
        cancelledAppointments: metrics.cancelledAppointments,
        noShowAppointments: metrics.noShowAppointments,
        totalRevenue: metrics.totalRevenue.amount,
        totalRefunds: metrics.totalRefunds.amount,
        newCustomers: metrics.newCustomers,
        returningCustomers: metrics.returningCustomers,
        avgAppointmentValue: metrics.avgAppointmentValue?.amount,
        avgBookingLeadTime: metrics.avgBookingLeadTime,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as unknown as RawDailyMetrics);
  }

  async getLatest(): Promise<DailyMetrics | null> {
    const raw = await this.db.dailyMetrics.findFirst({ orderBy: { date: 'desc' } });
    return raw ? this.toDomain(raw as unknown as RawDailyMetrics) : null;
  }
}
