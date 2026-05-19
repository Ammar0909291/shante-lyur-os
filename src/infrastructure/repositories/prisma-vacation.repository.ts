import { PrismaClient } from '@prisma/client';
import { IVacationRepository } from '@/application/ports/vacation-repository.port';
import { Vacation } from '@/domain/entities/vacation.entity';

type RawVacation = {
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

  private toDomain(raw: RawVacation): Vacation {
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
    return raw ? this.toDomain(raw as unknown as RawVacation) : null;
  }

  async findBySpecialist(specialistId: string): Promise<Vacation[]> {
    const raws = await this.db.vacation.findMany({
      where: { specialistId },
      orderBy: { startDate: 'desc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawVacation));
  }

  async findActiveVacations(specialistId: string, date: Date): Promise<Vacation[]> {
    const raws = await this.db.vacation.findMany({
      where: {
        specialistId,
        isApproved: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    return raws.map(r => this.toDomain(r as unknown as RawVacation));
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
    return this.toDomain(raw as unknown as RawVacation);
  }

  async update(vacation: Vacation): Promise<Vacation> {
    const raw = await this.db.vacation.update({
      where: { id: vacation.id },
      data: {
        specialistId: vacation.specialistId,
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        reason: vacation.reason,
        isApproved: vacation.isApproved,
        approvedBy: vacation.approvedBy,
        approvedAt: vacation.approvedAt,
      },
    });
    return this.toDomain(raw as unknown as RawVacation);
  }

  async delete(id: string): Promise<void> {
    await this.db.vacation.delete({ where: { id } });
  }

  async approve(id: string, approvedBy: string): Promise<Vacation> {
    const raw = await this.db.vacation.update({
      where: { id },
      data: { isApproved: true, approvedBy, approvedAt: new Date() },
    });
    return this.toDomain(raw as unknown as RawVacation);
  }
}
