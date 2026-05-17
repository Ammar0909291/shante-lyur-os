import { AppointmentStatus, UserRole } from '@/domain/enums';
import { NotFoundError, ForbiddenError, ConflictError } from '@/domain/errors';
import { DateRange } from '@/domain/value-objects';
import {
  IAppointmentRepository,
  ISpecialistRepository,
  IBlockedTimeRepository,
  IVacationRepository,
  IWorkingScheduleRepository,
  IAuditLogRepository,
} from '@/application/ports';
import { RescheduleAppointmentDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class RescheduleAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly specialistRepo: ISpecialistRepository,
    private readonly blockedTimeRepo: IBlockedTimeRepository,
    private readonly vacationRepo: IVacationRepository,
    private readonly workingScheduleRepo: IWorkingScheduleRepository,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(
    appointmentId: string,
    dto: RescheduleAppointmentDto,
    actorId: string,
    actorRole: UserRole
  ) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment', appointmentId);
    }

    if (actorRole === UserRole.CLIENT && appointment.clientId !== actorId) {
      throw new ForbiddenError();
    }

    if (!appointment.isModifiable) {
      throw new ConflictError('Cannot reschedule appointment in current status');
    }

    const newEndAt = new Date(dto.newStartAt.getTime() + appointment.totalDuration * 60000);
    const newTimeRange = DateRange.create(dto.newStartAt, newEndAt);

    // Check overlaps
    const overlapping = await this.appointmentRepo.findOverlapping(
      appointment.specialistId, newTimeRange, appointment.id
    );
    if (overlapping.length > 0) {
      throw new ConflictError('New time slot is not available');
    }

    const blocked = await this.blockedTimeRepo.findOverlapping(appointment.specialistId, newTimeRange);
    if (blocked.length > 0) {
      throw new ConflictError('Specialist is not available at new time');
    }

    const vacations = await this.vacationRepo.findActiveVacations(appointment.specialistId, dto.newStartAt);
    if (vacations.length > 0) {
      throw new ConflictError('Specialist is on vacation at new time');
    }

    const dayOfWeek = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][dto.newStartAt.getDay()] as any;
    const schedules = await this.workingScheduleRepo.findBySpecialistAndDay(appointment.specialistId, dayOfWeek);
    const validSchedule = schedules.find(s => {
      if (!s.isActive || !s.isValidForDate(dto.newStartAt)) return false;
      const startMin = s.startMinutes;
      const endMin = s.endMinutes;
      const apptStartMin = dto.newStartAt.getHours() * 60 + dto.newStartAt.getMinutes();
      const apptEndMin = newEndAt.getHours() * 60 + newEndAt.getMinutes();
      return apptStartMin >= startMin && apptEndMin <= endMin;
    });
    if (!validSchedule) {
      throw new ConflictError('New time is outside working hours');
    }

    const oldStartAt = appointment.startAt;
    const oldEndAt = appointment.endAt;

    appointment.reschedule(newTimeRange, actorId);
    const saved = await this.appointmentRepo.update(appointment);

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        appointmentId: saved.id,
        action: AuditAction.UPDATE,
        entityType: 'Appointment',
        entityId: saved.id,
        oldValues: { startAt: oldStartAt, endAt: oldEndAt },
        newValues: { startAt: saved.startAt, endAt: saved.endAt },
      })
    );

    return { appointment: saved };
  }
}
