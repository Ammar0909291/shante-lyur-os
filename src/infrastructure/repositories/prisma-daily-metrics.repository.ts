import { PrismaClient, Prisma } from '@prisma/client';
import { DailyMetricsRepositoryPort } from '@/application/ports/daily-metrics-repository.port';
import { DailyMetrics } from '@/domain/entities/daily-metrics.entity';
import { Money } from '@/domain/value-objects/money.vo';

type PrismaDailyMetrics = {
  id: string;
  date: Date;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: Prisma.Decimal;
  totalRefunds: Prisma.Decimal;
  newCustomers: number;
  returningCustomers: number;
  avgAppointmentValue: Prisma.Decimal | null;
  avgBookingLeadTime: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaDailyMetricsRepository implements DailyMetricsRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaDailyMetrics): DailyMetrics {
    return new DailyMetrics({
      id: raw.id,
      date: raw.date,
      totalAppointments: raw.totalAppointments,
      completedAppointments: raw.completedAppointments,
      cancelledAppointments: raw.cancelledAppointments,
      noShowAppointments: raw.noShowAppointments,
      totalRevenue: Money.create(Number(raw.totalRevenue)),
      totalRefunds: Money.create(Number(raw.totalRefunds)),
      newCustomers: raw.newCustomers,
      returningCustomers: raw.returningCustomers,
      avgAppointmentValue: raw.avgAppointmentValue ? Money.create(Number(raw.avgAppointmentValue)) : undefined,
      avgBookingLeadTime: raw.avgBookingLeadTime ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByDate(date: Date): Promise<DailyMetrics | null> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const raw = await this.db.dailyMetrics.findFirst({ where: { date: { gte: start, lte: end } } });
    return raw ? this.toDomain(raw) : null;
  }

  async findRange(from: Date, to: Date): Promise<DailyMetrics[]> {
    const raws = await this.db.dailyMetrics.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
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
    return this.toDomain(raw);
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
    return this.toDomain(raw);
  }

  async getLatest(): Promise<DailyMetrics | null> {
    const raw = await this.db.dailyMetrics.findFirst({ orderBy: { date: 'desc' } });
    return raw ? this.toDomain(raw) : null;
  }
}
