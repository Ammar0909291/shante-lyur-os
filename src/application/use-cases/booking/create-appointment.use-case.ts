import { Appointment, AppointmentServiceItem } from '@/domain/entities';
import { AppointmentStatus, UserRole } from '@/domain/enums';
import { DateRange, Money } from '@/domain/value-objects';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@/domain/errors';
import {
  IAppointmentRepository,
  IUserRepository,
  ISpecialistRepository,
  IServiceRepository,
  ILocationRepository,
  IWorkingScheduleRepository,
  IBlockedTimeRepository,
  IVacationRepository,
  ICustomerProfileRepository,
  IPromoCodeRepository,
  INotificationRepository,
} from '@/application/ports';
import { CreateAppointmentDto } from '@/application/dto';

export interface CreateAppointmentResult {
  appointment: Appointment;
  discountApplied?: { code: string; amount: number };
}

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly userRepo: IUserRepository,
    private readonly specialistRepo: ISpecialistRepository,
    private readonly serviceRepo: IServiceRepository,
    private readonly locationRepo: ILocationRepository,
    private readonly workingScheduleRepo: IWorkingScheduleRepository,
    private readonly blockedTimeRepo: IBlockedTimeRepository,
    private readonly vacationRepo: IVacationRepository,
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly promoCodeRepo: IPromoCodeRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(
    dto: CreateAppointmentDto,
    clientId: string,
    actorRole: UserRole
  ): Promise<CreateAppointmentResult> {
    // Authorization
    if (actorRole === UserRole.CLIENT && clientId !== clientId) {
      throw new ForbiddenError('Clients can only book for themselves');
    }

    // Validate specialist
    const specialist = await this.specialistRepo.findById(dto.specialistId);
    if (!specialist || !specialist.isActive) {
      throw new NotFoundError('Specialist', dto.specialistId);
    }

    // Validate location
    const location = await this.locationRepo.findById(dto.locationId);
    if (!location || !location.isActive) {
      throw new NotFoundError('Location', dto.locationId);
    }

    // Validate services
    const serviceIds = dto.services.map(s => s.serviceId);
    const services = await this.serviceRepo.findByIds(serviceIds);
    if (services.length !== serviceIds.length) {
      const foundIds = new Set(services.map(s => s.id));
      const missing = serviceIds.filter(id => !foundIds.has(id));
      throw new NotFoundError('Service', missing.join(', '));
    }

    // Check all services are active
    const inactive = services.filter(s => !s.isActive);
    if (inactive.length > 0) {
      throw new ConflictError(`Services not available: ${inactive.map(s => s.name).join(', ')}`);
    }

    // Calculate duration and price
    let totalDuration = 0;
    let totalPrice = Money.zero('RUB');
    const appointmentServices: AppointmentServiceItem[] = [];

    for (const [idx, svcDto] of dto.services.entries()) {
      const service = services.find(s => s.id === svcDto.serviceId)!;
      const locationPrice = await this.serviceRepo.getLocationPrice(service.id, location.id);
      const price = locationPrice ? Money.create(locationPrice.price, 'RUB') : service.basePrice;
      const duration = locationPrice ? locationPrice.duration : service.baseDuration;

      totalDuration += duration;
      totalPrice = totalPrice.add(price);

      appointmentServices.push({
        serviceId: service.id,
        name: service.name,
        price,
        duration,
        sortOrder: idx,
      });
    }

    const endAt = new Date(dto.startAt.getTime() + totalDuration * 60000);
    const timeRange = DateRange.create(dto.startAt, endAt);

    // Check specialist availability
    const overlapping = await this.appointmentRepo.findOverlapping(specialist.id, timeRange);
    if (overlapping.length > 0) {
      throw new ConflictError('Time slot is not available', 'startAt');
    }

    // Check blocked times
    const blocked = await this.blockedTimeRepo.findOverlapping(specialist.id, timeRange);
    if (blocked.length > 0) {
      throw new ConflictError('Specialist is not available at this time', 'startAt');
    }

    // Check vacation
    const vacations = await this.vacationRepo.findActiveVacations(specialist.id, dto.startAt);
    if (vacations.length > 0) {
      throw new ConflictError('Specialist is on vacation', 'startAt');
    }

    // Check working schedule
    const dayOfWeek = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][dto.startAt.getDay()] as any;
    const schedules = await this.workingScheduleRepo.findBySpecialistAndDay(specialist.id, dayOfWeek);
    const validSchedule = schedules.find(s => {
      if (!s.isActive || !s.isValidForDate(dto.startAt)) return false;
      const startMin = s.startMinutes;
      const endMin = s.endMinutes;
      const apptStartMin = dto.startAt.getHours() * 60 + dto.startAt.getMinutes();
      const apptEndMin = endAt.getHours() * 60 + endAt.getMinutes();
      return apptStartMin >= startMin && apptEndMin <= endMin;
    });
    if (!validSchedule) {
      throw new ConflictError('Outside working hours', 'startAt');
    }

    // Apply promo code
    let discountApplied: { code: string; amount: number } | undefined;
    if (dto.promoCode) {
      const promo = await this.promoCodeRepo.findByCode(dto.promoCode.toUpperCase());
      if (promo && promo.isValid) {
        const discount = promo.calculateDiscount(totalPrice);
        totalPrice = totalPrice.subtract(discount);
        discountApplied = { code: promo.code, amount: discount.amount };
        await this.promoCodeRepo.recordUsage(promo.id, clientId, 'pending', discount.amount);
      }
    }

    // Create appointment
    const appointment = new Appointment({
      id: crypto.randomUUID(),
      clientId,
      specialistId: specialist.id,
      locationId: location.id,
      timeSlot: timeRange,
      status: AppointmentStatus.PENDING,
      services: appointmentServices,
      totalPrice,
      totalDuration,
      notes: dto.notes,
      source: dto.source,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.appointmentRepo.create(appointment);

    // Update customer profile
    await this.profileRepo.recordVisit(clientId, 0); // Visit recorded, amount updated on payment

    return { appointment: saved, discountApplied };
  }
}
