import { PrismaClient } from '@prisma/client';
import { IVacationRepository } from '@/application/ports/vacation-repository.port';
import { Vacation } from '@/domain/entities/vacation.entity';

type PrismaVacation = {
  id: string;
  specialistId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

export class PrismaVacationRepository implements IVacationRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaVacation): Vacation {
    return new Vacation({
      id: raw.id,
      specialistId: raw.specialistId,
      startDate: raw.startDate,
      endDate: raw.endDate,
      reason: raw.reason ?? undefined,
      isApproved: raw.isApproved,
      approvedBy: raw.approvedBy ?? undefined,
      approvedAt: raw.approvedAt ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<Vacation | null> {
    const raw = await this.db.vacation.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findBySpecialist(specialistId: string): Promise<Vacation[]> {
    const raws = await this.db.vacation.findMany({
      where: { specialistId },
      orderBy: { startDate: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findActiveVacations(specialistId: string, date: Date): Promise<Vacation[]> {
    const raws = await this.db.vacation.findMany({
      where: {
        specialistId,
        startDate: { lte: date },
        endDate: { gte: date },
        isApproved: true,
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
        isApproved: vacation.isApproved,
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
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        reason: vacation.reason,
        isApproved: vacation.isApproved,
        approvedBy: vacation.approvedBy,
        approvedAt: vacation.approvedAt,
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.vacation.delete({ where: { id } });
  }

  async approve(id: string, approvedBy: string): Promise<Vacation> {
    const raw = await this.db.vacation.update({
      where: { id },
      data: { isApproved: true, approvedBy, approvedAt: new Date() },
    });
    return this.toDomain(raw);
  }
}
