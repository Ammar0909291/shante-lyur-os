import { PrismaClient } from '@prisma/client';
import { IWorkingScheduleRepository } from '@/application/ports/working-schedule-repository.port';
import { WorkingSchedule } from '@/domain/entities/working-schedule.entity';
import { DayOfWeek } from '@/domain/enums/day-of-week.enum';

type WorkingScheduleRow = {
  id: string;
  specialistId: string;
  locationId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaWorkingScheduleRepository implements IWorkingScheduleRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: WorkingScheduleRow): WorkingSchedule {
    return new WorkingSchedule({
      id: raw.id,
      specialistId: raw.specialistId,
      locationId: raw.locationId,
      dayOfWeek: raw.dayOfWeek as DayOfWeek,
      startTime: raw.startTime,
      endTime: raw.endTime,
      breakStart: raw.breakStart ?? undefined,
      breakEnd: raw.breakEnd ?? undefined,
      isActive: raw.isActive,
      validFrom: raw.validFrom,
      validUntil: raw.validUntil ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<WorkingSchedule | null> {
    const raw = await this.db.workingSchedule.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findBySpecialistId(specialistId: string): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { specialistId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findBySpecialistAndDay(
    specialistId: string,
    dayOfWeek: DayOfWeek,
    forDate?: Date,
  ): Promise<WorkingSchedule[]> {
    const date = forDate ?? new Date();
    const raws = await this.db.workingSchedule.findMany({
      where: {
        specialistId,
        dayOfWeek,
        isActive: true,
        validFrom: { lte: date },
        OR: [
          { validUntil: null },
          { validUntil: { gte: date } },
        ],
      },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(ws: WorkingSchedule): Promise<WorkingSchedule> {
    const raw = await this.db.workingSchedule.create({
      data: {
        id: ws.id,
        specialistId: ws.specialistId,
        locationId: ws.locationId,
        dayOfWeek: ws.dayOfWeek,
        startTime: ws.startTime,
        endTime: ws.endTime,
        breakStart: ws.breakStart ?? null,
        breakEnd: ws.breakEnd ?? null,
        isActive: ws.isActive,
        validFrom: ws.validFrom,
        validUntil: ws.validUntil ?? null,
      },
    });
    return this.toDomain(raw);
  }

  async update(ws: WorkingSchedule): Promise<WorkingSchedule> {
    const raw = await this.db.workingSchedule.update({
      where: { id: ws.id },
      data: {
        dayOfWeek: ws.dayOfWeek,
        startTime: ws.startTime,
        endTime: ws.endTime,
        breakStart: ws.breakStart ?? null,
        breakEnd: ws.breakEnd ?? null,
        isActive: ws.isActive,
        validFrom: ws.validFrom,
        validUntil: ws.validUntil ?? null,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async findByLocation(locationId: string): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { locationId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return raws.map(r => this.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.workingSchedule.delete({ where: { id } });
  }

  async deleteBySpecialist(specialistId: string): Promise<void> {
    await this.db.workingSchedule.deleteMany({ where: { specialistId } });
  }
}
