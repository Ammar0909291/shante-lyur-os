import { IAppointmentRepository, ISpecialistRepository } from '@/application/ports';
import { AppointmentStatus } from '@/domain/enums';
import { ListAppointmentsDto } from '@/application/dto';

export class ListAppointmentsUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly specialistRepo?: ISpecialistRepository,
  ) {}

  async execute(dto: ListAppointmentsDto, userId: string, userRole: string) {
    // CLIENT can only see their own bookings
    if (userRole === 'CLIENT') {
      return this.appointmentRepo.findMany({
        clientId: userId,
        specialistId: dto.specialistId,
        locationId: dto.locationId,
        status: dto.status as AppointmentStatus | undefined,
        from: dto.from,
        to: dto.to,
        page: dto.page,
        limit: dto.limit,
      });
    }

    // SPECIALIST can only see their own appointments
    if (userRole === 'SPECIALIST') {
      let ownSpecialistId: string | undefined;
      if (this.specialistRepo) {
        const specialist = await this.specialistRepo.findByUserId(userId);
        ownSpecialistId = specialist?.id;
      }
      // If we can't resolve their specialist record, restrict to empty result
      if (!ownSpecialistId) {
        return { items: [], total: 0 };
      }
      return this.appointmentRepo.findMany({
        specialistId: ownSpecialistId,
        locationId: dto.locationId,
        status: dto.status as AppointmentStatus | undefined,
        from: dto.from,
        to: dto.to,
        page: dto.page,
        limit: dto.limit,
      });
    }

    // ADMIN / OPERATOR / SUPER_ADMIN: full access with optional filters
    return this.appointmentRepo.findMany({
      clientId: dto.clientId,
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
