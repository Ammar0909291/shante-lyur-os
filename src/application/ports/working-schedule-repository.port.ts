import { WorkingSchedule } from '@/domain/entities';
import { DayOfWeek } from '@/domain/enums';

export interface IWorkingScheduleRepository {
  findById(id: string): Promise<WorkingSchedule | null>;
  findBySpecialist(specialistId: string): Promise<WorkingSchedule[]>;
  findBySpecialistAndDay(specialistId: string, dayOfWeek: DayOfWeek): Promise<WorkingSchedule[]>;
  findByLocation(locationId: string): Promise<WorkingSchedule[]>;
  create(schedule: WorkingSchedule): Promise<WorkingSchedule>;
  update(schedule: WorkingSchedule): Promise<WorkingSchedule>;
  delete(id: string): Promise<void>;
  deleteBySpecialist(specialistId: string): Promise<void>;
}
