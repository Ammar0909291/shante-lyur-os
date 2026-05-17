import { PrismaClient } from '@prisma/client';
import { IBlockedTimeRepository } from '@/application/ports/blocked-time-repository.port';
import { BlockedTime } from '@/domain/entities/blocked-time.entity';
import { DateRange } from '@/domain/value-objects/date-range.vo';

type PrismaBlockedTime = {
  id: string;
  specialistId: string;
  locationId: string | null;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdAt: Date;
};

export class PrismaBlockedTimeRepository implements IBlockedTimeRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaBlockedTime): BlockedTime {
    return new BlockedTime({
      id: raw.id,
      specialistId: raw.specialistId,
      locationId: raw.locationId ?? undefined,
      timeRange: DateRange.create(raw.startAt, raw.endAt),
      reason: raw.reason ?? undefined,
      isRecurring: raw.isRecurring,
      recurrenceRule: raw.recurrenceRule ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<BlockedTime | null> {
    const raw = await this.db.blockedTime.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findBySpecialist(specialistId: string, from?: Date, to?: Date): Promise<BlockedTime[]> {
    const raws = await this.db.blockedTime.findMany({
      where: {
        specialistId,
        ...(from || to ? {
          startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) },
        } : {}),
      },
      orderBy: { startAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findByLocation(locationId: string, from?: Date, to?: Date): Promise<BlockedTime[]> {
    const raws = await this.db.blockedTime.findMany({
      where: {
        locationId,
        ...(from || to ? {
          startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) },
        } : {}),
      },
      orderBy: { startAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findOverlapping(specialistId: string, timeRange: DateRange): Promise<BlockedTime[]> {
    const raws = await this.db.blockedTime.findMany({
      where: {
        specialistId,
        startAt: { lt: timeRange.end },
        endAt: { gt: timeRange.start },
      },
      orderBy: { startAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(bt: BlockedTime): Promise<BlockedTime> {
    const raw = await this.db.blockedTime.create({
      data: {
        id: bt.id,
        specialistId: bt.specialistId,
        locationId: bt.locationId,
        startAt: bt.timeRange.start,
        endAt: bt.timeRange.end,
        reason: bt.reason,
        isRecurring: bt.isRecurring,
        recurrenceRule: bt.recurrenceRule,
      },
    });
    return this.toDomain(raw);
  }

  async update(bt: BlockedTime): Promise<BlockedTime> {
    const raw = await this.db.blockedTime.update({
      where: { id: bt.id },
      data: {
        startAt: bt.timeRange.start,
        endAt: bt.timeRange.end,
        reason: bt.reason,
        isRecurring: bt.isRecurring,
        recurrenceRule: bt.recurrenceRule,
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.blockedTime.delete({ where: { id } });
  }
}
