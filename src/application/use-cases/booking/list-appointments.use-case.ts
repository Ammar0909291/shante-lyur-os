import { IAppointmentRepository } from '@/application/ports';
import { ListAppointmentsDto } from '@/application/dto';
import { AppointmentStatus } from '@/domain/enums';

export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(dto: ListAppointmentsDto, userId: string, userRole: string) {
    // Clients can only see their own
    const clientId = userRole === 'CLIENT' ? userId : dto.clientId;

    return this.appointmentRepo.findMany({
      clientId: clientId as string | undefined,
      specialistId: dto.specialistId as string | undefined,
      locationId: dto.locationId as string | undefined,
      status: dto.status as AppointmentStatus | undefined,
      from: dto.from,
      to: dto.to,
      page: dto.page,
      limit: dto.limit,
    });
  }
}
