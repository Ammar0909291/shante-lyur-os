import { PrismaClient } from '@prisma/client';
import { IWorkingScheduleRepository } from '@/application/ports/working-schedule-repository.port';
import { WorkingSchedule } from '@/domain/entities/working-schedule.entity';
import { DayOfWeek } from '@/domain/enums/day-of-week.enum';

type PrismaWorkingSchedule = {
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

  private toDomain(raw: PrismaWorkingSchedule): WorkingSchedule {
    return WorkingSchedule.reconstitute({
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
    return raw ? this.toDomain(raw as PrismaWorkingSchedule) : null;
  }

  async findBySpecialist(specialistId: string): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { specialistId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    return raws.map(r => this.toDomain(r as PrismaWorkingSchedule));
  }

  async findBySpecialistAndDay(specialistId: string, dayOfWeek: DayOfWeek): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { specialistId, dayOfWeek, isActive: true },
    });
    return raws.map(r => this.toDomain(r as PrismaWorkingSchedule));
  }

  async findByLocation(locationId: string): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { locationId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return raws.map(r => this.toDomain(r as PrismaWorkingSchedule));
  }

  async create(schedule: WorkingSchedule): Promise<WorkingSchedule> {
    const raw = await this.db.workingSchedule.create({
      data: {
        id: schedule.id,
        specialistId: schedule.specialistId,
        locationId: schedule.locationId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        isActive: schedule.isActive,
        validFrom: schedule.validFrom,
        validUntil: schedule.validUntil,
      },
    });
    return this.toDomain(raw as PrismaWorkingSchedule);
  }

  async update(schedule: WorkingSchedule): Promise<WorkingSchedule> {
    const raw = await this.db.workingSchedule.update({
      where: { id: schedule.id },
      data: {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        isActive: schedule.isActive,
        validFrom: schedule.validFrom,
        validUntil: schedule.validUntil,
      },
    });
    return this.toDomain(raw as PrismaWorkingSchedule);
  }

  async delete(id: string): Promise<void> {
    await this.db.workingSchedule.delete({ where: { id } });
  }

  async deleteBySpecialist(specialistId: string): Promise<void> {
    await this.db.workingSchedule.deleteMany({ where: { specialistId } });
  }
}
