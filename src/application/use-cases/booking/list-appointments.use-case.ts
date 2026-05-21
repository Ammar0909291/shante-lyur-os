import { IAppointmentRepository } from '@/application/ports';
import { AppointmentStatus } from '@/domain/enums';
import { ListAppointmentsDto } from '@/application/dto';

export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(dto: ListAppointmentsDto, userId: string, userRole: string) {
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
