import { AppointmentStatus } from '@/domain/enums';
import { IAppointmentRepository } from '@/application/ports';
import { ListAppointmentsDto } from '@/application/dto';

export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(dto: ListAppointmentsDto, userId: string, userRole: string) {
    // Clients can only see their own
    const clientId = userRole === 'CLIENT' ? userId : dto.clientId;

    return this.appointmentRepo.findMany({
      clientId,
      specialistId: dto.specialistId,
      locationId: dto.locationId,
      status: dto.status as AppointmentStatus | undefined,
      from: dto.from,
      to: dto.to,
      page: dto.page,
      limit: dto.limit,
    });
  }
}
