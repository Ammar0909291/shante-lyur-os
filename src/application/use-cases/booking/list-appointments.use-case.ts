import { IAppointmentRepository } from '@/application/ports';
import { AppointmentStatus } from '@/domain/enums';

interface ListAppointmentsParams {
  clientId?: string;
  specialistId?: string;
  locationId?: string;
  status?: string | string[];
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(dto: ListAppointmentsParams, userId: string, userRole: string) {
    // Clients can only see their own
    const clientId = userRole === 'CLIENT' ? userId : (dto.clientId as string | undefined);

    return this.appointmentRepo.findMany({
      clientId,
      specialistId: dto.specialistId as string | undefined,
      locationId: dto.locationId as string | undefined,
      status: dto.status as AppointmentStatus | AppointmentStatus[] | undefined,
      from: dto.from,
      to: dto.to,
      page: dto.page,
      limit: dto.limit,
    });
  }
}
