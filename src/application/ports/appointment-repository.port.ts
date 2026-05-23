import { Appointment } from '@/domain/entities';
import { AppointmentStatus } from '@/domain/enums';
import { DateRange } from '@/domain/value-objects';

export type AppointmentRepositoryPort = IAppointmentRepository;

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findMany(options: {
    clientId?: string;
    specialistId?: string;
    locationId?: string;
    status?: AppointmentStatus | AppointmentStatus[];
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: Appointment[]; total: number }>;
  findOverlapping(specialistId: string, timeRange: DateRange, excludeId?: string): Promise<Appointment[]>;
  create(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<Appointment>;
  delete(id: string): Promise<void>;
  countByStatus(status: AppointmentStatus): Promise<number>;
  countBySpecialistAndDate(specialistId: string, date: Date): Promise<number>;
}
