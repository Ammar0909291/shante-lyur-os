import { PrismaClient } from '@prisma/client';
import { IDailyMetricsRepository } from '@/application/ports/daily-metrics-repository.port';
import { DailyMetrics } from '@/domain/entities/daily-metrics.entity';
import { Money } from '@/domain/value-objects/money.vo';

type PrismaDailyMetrics = {
  id: string;
  date: Date;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: { toNumber(): number };
  totalRefunds: { toNumber(): number };
  newCustomers: number;
  returningCustomers: number;
  avgAppointmentValue: { toNumber(): number } | null;
  avgBookingLeadTime: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaDailyMetricsRepository implements IDailyMetricsRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaDailyMetrics): DailyMetrics {
    return DailyMetrics.reconstitute({
      id: raw.id,
      date: raw.date,
      totalRevenue: Money.create(raw.totalRevenue.toNumber()),
      totalRefunds: Money.create(raw.totalRefunds.toNumber()),
      totalAppointments: raw.totalAppointments,
      completedAppointments: raw.completedAppointments,
      cancelledAppointments: raw.cancelledAppointments,
      noShowAppointments: raw.noShowAppointments,
      newCustomers: raw.newCustomers,
      returningCustomers: raw.returningCustomers,
      avgAppointmentValue: raw.avgAppointmentValue ? Money.create(raw.avgAppointmentValue.toNumber()) : undefined,
      avgBookingLeadTime: raw.avgBookingLeadTime ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByDate(date: Date): Promise<DailyMetrics | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const raw = await this.db.dailyMetrics.findFirst({ where: { date: { gte: start } } });
    return raw ? this.toDomain(raw as PrismaDailyMetrics) : null;
  }

  async findRange(from: Date, to: Date): Promise<DailyMetrics[]> {
    const raws = await this.db.dailyMetrics.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    return raws.map(r => this.toDomain(r as PrismaDailyMetrics));
  }

  async create(metrics: DailyMetrics): Promise<DailyMetrics> {
    const raw = await this.db.dailyMetrics.create({
      data: {
        id: metrics.id,
        date: metrics.date,
        totalRevenue: metrics.totalRevenue.amount,
        totalRefunds: metrics.totalRefunds.amount,
        totalAppointments: metrics.totalAppointments,
        completedAppointments: metrics.completedAppointments,
        cancelledAppointments: metrics.cancelledAppointments,
        noShowAppointments: metrics.noShowAppointments,
        newCustomers: metrics.newCustomers,
        returningCustomers: metrics.returningCustomers,
        avgAppointmentValue: metrics.avgAppointmentValue?.amount ?? null,
        avgBookingLeadTime: metrics.avgBookingLeadTime ?? null,
      },
    });
    return this.toDomain(raw as PrismaDailyMetrics);
  }

  async update(metrics: DailyMetrics): Promise<DailyMetrics> {
    const raw = await this.db.dailyMetrics.update({
      where: { id: metrics.id },
      data: {
        totalRevenue: metrics.totalRevenue.amount,
        totalRefunds: metrics.totalRefunds.amount,
        totalAppointments: metrics.totalAppointments,
        completedAppointments: metrics.completedAppointments,
        cancelledAppointments: metrics.cancelledAppointments,
        noShowAppointments: metrics.noShowAppointments,
        newCustomers: metrics.newCustomers,
        returningCustomers: metrics.returningCustomers,
        avgAppointmentValue: metrics.avgAppointmentValue?.amount ?? null,
        avgBookingLeadTime: metrics.avgBookingLeadTime ?? null,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as PrismaDailyMetrics);
  }

  async getLatest(): Promise<DailyMetrics | null> {
    const raw = await this.db.dailyMetrics.findFirst({ orderBy: { date: 'desc' } });
    return raw ? this.toDomain(raw as PrismaDailyMetrics) : null;
  }
}
