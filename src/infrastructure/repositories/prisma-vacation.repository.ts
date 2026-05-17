import { PrismaClient } from '@prisma/client';
import { VacationRepositoryPort } from '@/application/ports/vacation-repository.port';
import { Vacation } from '@/domain/entities/vacation.entity';

export class PrismaVacationRepository implements VacationRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; specialistId: string; startDate: Date; endDate: Date; reason: string | null; approvedBy: string | null; approvedAt: Date | null; createdAt: Date; updatedAt: Date }): Vacation {
    return Vacation.reconstitute({
      id: raw.id,
      specialistId: raw.specialistId,
      startDate: raw.startDate,
      endDate: raw.endDate,
      reason: raw.reason ?? undefined,
      approvedBy: raw.approvedBy ?? undefined,
      approvedAt: raw.approvedAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Vacation | null> {
    const raw = await this.db.vacation.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findBySpecialistId(specialistId: string): Promise<Vacation[]> {
    const raws = await this.db.vacation.findMany({
      where: { specialistId },
      orderBy: { startDate: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findOverlapping(specialistId: string, startDate: Date, endDate: Date): Promise<Vacation[]> {
    const raws = await this.db.vacation.findMany({
      where: {
        specialistId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(vacation: Vacation): Promise<Vacation> {
    const raw = await this.db.vacation.create({
      data: {
        id: vacation.id,
        specialistId: vacation.specialistId,
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        reason: vacation.reason,
        approvedBy: vacation.approvedBy,
        approvedAt: vacation.approvedAt,
      },
    });
    return this.toDomain(raw);
  }

  async update(vacation: Vacation): Promise<Vacation> {
    const raw = await this.db.vacation.update({
      where: { id: vacation.id },
      data: {
        specialistId: vacation.specialistId,
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        reason: vacation.reason,
        approvedBy: vacation.approvedBy,
        approvedAt: vacation.approvedAt,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.vacation.delete({ where: { id } });
  }
}
