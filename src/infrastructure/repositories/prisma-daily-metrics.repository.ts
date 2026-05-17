import { PrismaClient } from '@prisma/client';
import { DailyMetricsRepositoryPort } from '@/application/ports/daily-metrics-repository.port';
import { DailyMetrics } from '@/domain/entities/daily-metrics.entity';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaDailyMetricsRepository implements DailyMetricsRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; date: Date; totalRevenue: number; totalAppointments: number; completedAppointments: number; cancelledAppointments: number; noShowCount: number; newCustomers: number; averageTicket: number; createdAt: Date; updatedAt: Date }): DailyMetrics {
    return DailyMetrics.reconstitute({
      id: raw.id,
      date: raw.date,
      totalRevenue: Money.create(raw.totalRevenue).getValue(),
      totalAppointments: raw.totalAppointments,
      completedAppointments: raw.completedAppointments,
      cancelledAppointments: raw.cancelledAppointments,
      noShowCount: raw.noShowCount,
      newCustomers: raw.newCustomers,
      averageTicket: Money.create(raw.averageTicket).getValue(),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByDate(date: Date): Promise<DailyMetrics | null> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const raw = await this.db.dailyMetrics.findFirst({ where: { date: { gte: start } } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByDateRange(start: Date, end: Date): Promise<DailyMetrics[]> {
    const raws = await this.db.dailyMetrics.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(metrics: DailyMetrics): Promise<DailyMetrics> {
    const raw = await this.db.dailyMetrics.create({
      data: {
        id: metrics.id,
        date: metrics.date,
        totalRevenue: metrics.totalRevenue,
        totalAppointments: metrics.totalAppointments,
        completedAppointments: metrics.completedAppointments,
        cancelledAppointments: metrics.cancelledAppointments,
        noShowCount: metrics.noShowCount,
        newCustomers: metrics.newCustomers,
        averageTicket: metrics.averageTicket,
      },
    });
    return this.toDomain(raw);
  }

  async update(metrics: DailyMetrics): Promise<DailyMetrics> {
    const raw = await this.db.dailyMetrics.update({
      where: { id: metrics.id },
      data: {
        totalRevenue: metrics.totalRevenue,
        totalAppointments: metrics.totalAppointments,
        completedAppointments: metrics.completedAppointments,
        cancelledAppointments: metrics.cancelledAppointments,
        noShowCount: metrics.noShowCount,
        newCustomers: metrics.newCustomers,
        averageTicket: metrics.averageTicket,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }
}
