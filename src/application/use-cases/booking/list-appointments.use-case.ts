import { AppointmentStatus } from '@/domain/enums';
import { IAppointmentRepository } from '@/application/ports';
import { ListAppointmentsDto } from '@/application/dto';

export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(dto: ListAppointmentsDto, userId: string, userRole: string) {
    const clientId = userRole === 'CLIENT' ? userId : (dto.clientId as string | undefined);

    return this.appointmentRepo.findMany({
      clientId,
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
