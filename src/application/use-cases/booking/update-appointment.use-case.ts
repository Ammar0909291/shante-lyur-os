import { AppointmentStatus, UserRole, canTransitionStatus } from '@/domain/enums';
import { NotFoundError, ForbiddenError, ValidationError } from '@/domain/errors';
import {
  IAppointmentRepository,
  IUserRepository,
  IAuditLogRepository,
  INotificationRepository,
} from '@/application/ports';
import { UpdateAppointmentDto, CancelAppointmentDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class UpdateAppointmentStatusUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly userRepo: IUserRepository,
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(
    appointmentId: string,
    dto: UpdateAppointmentDto,
    actorId: string,
    actorRole: UserRole
  ) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment', appointmentId);
    }

    // Authorization checks
    if (actorRole === UserRole.CLIENT && appointment.clientId !== actorId) {
      throw new ForbiddenError();
    }
    if (actorRole === UserRole.SPECIALIST && appointment.specialistId !== actorId) {
      throw new ForbiddenError();
    }

    if (!dto.status) {
      throw new ValidationError('Status is required');
    }

    const oldStatus = appointment.status;
    const newStatus = dto.status;

    // Validate transition
    if (!canTransitionStatus(oldStatus, newStatus)) {
      throw new ValidationError(`Cannot transition from ${oldStatus} to ${newStatus}`);
    }

    // Role-based status restrictions
    if (newStatus === AppointmentStatus.CONFIRMED && actorRole === UserRole.CLIENT) {
      throw new ForbiddenError('Clients cannot confirm appointments');
    }
    if (newStatus === AppointmentStatus.IN_PROGRESS && ![UserRole.SPECIALIST, UserRole.ADMIN, UserRole.OPERATOR].includes(actorRole)) {
      throw new ForbiddenError('Only specialists and staff can start appointments');
    }
    if (newStatus === AppointmentStatus.COMPLETED && ![UserRole.SPECIALIST, UserRole.ADMIN, UserRole.OPERATOR].includes(actorRole)) {
      throw new ForbiddenError('Only specialists and staff can complete appointments');
    }

    // Execute transition
    switch (newStatus) {
      case AppointmentStatus.CONFIRMED:
        appointment.confirm(actorId);
        break;
      case AppointmentStatus.IN_PROGRESS:
        appointment.startInProgress(actorId);
        break;
      case AppointmentStatus.COMPLETED:
        appointment.complete(actorId);
        break;
      case AppointmentStatus.NO_SHOW:
        appointment.markNoShow(actorId);
        break;
      default:
        throw new ValidationError(`Unhandled status transition to ${newStatus}`);
    }

    const saved = await this.appointmentRepo.update(appointment);

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        appointmentId: appointment.id,
        action: AuditAction.UPDATE,
        entityType: 'Appointment',
        entityId: appointment.id,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus },
      })
    );

    return { appointment: saved, oldStatus, newStatus };
  }
}
