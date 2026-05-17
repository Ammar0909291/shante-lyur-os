import { PrismaClient } from '@prisma/client';
import { BlockedTimeRepositoryPort } from '@/application/ports/blocked-time-repository.port';
import { BlockedTime } from '@/domain/entities/blocked-time.entity';

export class PrismaBlockedTimeRepository implements BlockedTimeRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; specialistId: string; startAt: Date; endAt: Date; reason: string | null; createdBy: string; createdAt: Date; updatedAt: Date }): BlockedTime {
    return BlockedTime.reconstitute({
      id: raw.id,
      specialistId: raw.specialistId,
      startAt: raw.startAt,
      endAt: raw.endAt,
      reason: raw.reason ?? undefined,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<BlockedTime | null> {
    const raw = await this.db.blockedTime.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findBySpecialistId(specialistId: string, start: Date, end: Date): Promise<BlockedTime[]> {
    const raws = await this.db.blockedTime.findMany({
      where: {
        specialistId,
        startAt: { lt: end },
        endAt: { gt: start },
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
        startAt: bt.startAt,
        endAt: bt.endAt,
        reason: bt.reason,
        createdBy: bt.createdBy,
      },
    });
    return this.toDomain(raw);
  }

  async update(bt: BlockedTime): Promise<BlockedTime> {
    const raw = await this.db.blockedTime.update({
      where: { id: bt.id },
      data: {
        specialistId: bt.specialistId,
        startAt: bt.startAt,
        endAt: bt.endAt,
        reason: bt.reason,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.blockedTime.delete({ where: { id } });
  }
}
