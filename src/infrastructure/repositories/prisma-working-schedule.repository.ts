import { PrismaClient } from '@prisma/client';
import { IWorkingScheduleRepository } from '@/application/ports/working-schedule-repository.port';
import { WorkingSchedule } from '@/domain/entities/working-schedule.entity';
import { DayOfWeek } from '@/domain/enums/day-of-week.enum';

type RawWorkingSchedule = {
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

  private toDomain(raw: RawWorkingSchedule): WorkingSchedule {
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
    return raw ? this.toDomain(raw as unknown as RawWorkingSchedule) : null;
  }

  async findBySpecialist(specialistId: string): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { specialistId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawWorkingSchedule));
  }

  async findBySpecialistAndDay(specialistId: string, dayOfWeek: DayOfWeek): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { specialistId, dayOfWeek, isActive: true },
    });
    return raws.map(r => this.toDomain(r as unknown as RawWorkingSchedule));
  }

  async findByLocation(locationId: string): Promise<WorkingSchedule[]> {
    const raws = await this.db.workingSchedule.findMany({
      where: { locationId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawWorkingSchedule));
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
        breakStart: ws.breakStart,
        breakEnd: ws.breakEnd,
        isActive: ws.isActive,
        validFrom: ws.validFrom,
        validUntil: ws.validUntil,
      },
    });
    return this.toDomain(raw as unknown as RawWorkingSchedule);
  }

  async update(ws: WorkingSchedule): Promise<WorkingSchedule> {
    const raw = await this.db.workingSchedule.update({
      where: { id: ws.id },
      data: {
        specialistId: ws.specialistId,
        locationId: ws.locationId,
        dayOfWeek: ws.dayOfWeek,
        startTime: ws.startTime,
        endTime: ws.endTime,
        breakStart: ws.breakStart,
        breakEnd: ws.breakEnd,
        isActive: ws.isActive,
        validFrom: ws.validFrom,
        validUntil: ws.validUntil,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as unknown as RawWorkingSchedule);
  }

  async delete(id: string): Promise<void> {
    await this.db.workingSchedule.delete({ where: { id } });
  }

  async deleteBySpecialist(specialistId: string): Promise<void> {
    await this.db.workingSchedule.deleteMany({ where: { specialistId } });
  }
}
