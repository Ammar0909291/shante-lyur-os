import { Appointment, AppointmentServiceItem } from '@/domain/entities';
import { AppointmentStatus, UserRole } from '@/domain/enums';
import { DateRange, Money } from '@/domain/value-objects';
import { NotFoundError, ConflictError } from '@/domain/errors';
import { AppointmentBookedEvent } from '@/domain/events';
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
  IEventBus,
  INotificationRepository,
} from '@/application/ports';
import { CreateAppointmentDto } from '@/application/dto';
import { getLocalMinutes, getDayOfWeekInTz, getSalonTz } from '@/lib/timezone';

export interface CreateAppointmentResult {
  appointment: Appointment;
  discountApplied?: { code: string; amount: number };
}

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    _userRepo: IUserRepository,
    private readonly specialistRepo: ISpecialistRepository,
    private readonly serviceRepo: IServiceRepository,
    private readonly locationRepo: ILocationRepository,
    private readonly workingScheduleRepo: IWorkingScheduleRepository,
    private readonly blockedTimeRepo: IBlockedTimeRepository,
    private readonly vacationRepo: IVacationRepository,
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly promoCodeRepo: IPromoCodeRepository,
    private readonly eventBus: IEventBus,
    _notificationRepo: INotificationRepository,
  ) {}

  async execute(
    dto: CreateAppointmentDto,
    clientId: string,
    _actorRole: UserRole
  ): Promise<CreateAppointmentResult> {
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

    const inactive = services.filter(s => !s.isActive);
    if (inactive.length > 0) {
      throw new ConflictError(`Services not available: ${inactive.map(s => s.name).join(', ')}`);
    }

    // Calculate duration and price
    let totalDuration = 0;
    let totalPrice = Money.zero('RUB');
    const appointmentServices: AppointmentServiceItem[] = [];

    for (const [idx, svcDto] of Array.from(dto.services.entries())) {
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

    // Check specialist availability (existing appointments)
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

    // Check working schedule — timezone-safe
    const tz = getSalonTz();
    const dayOfWeek = getDayOfWeekInTz(dto.startAt, tz) as any;
    const schedules = await this.workingScheduleRepo.findBySpecialistAndDay(specialist.id, dayOfWeek, dto.startAt);

    const apptStartMin = getLocalMinutes(dto.startAt, tz);
    const apptEndMin   = getLocalMinutes(endAt, tz);

    const validSchedule = schedules.find(s => {
      if (!s.isActive || !s.isValidForDate(dto.startAt)) return false;
      if (apptStartMin < s.startMinutes || apptEndMin > s.endMinutes) return false;

      // Reject if appointment overlaps specialist's break
      const bStart = s.breakStartMinutes;
      const bEnd   = s.breakEndMinutes;
      if (bStart !== undefined && bEnd !== undefined) {
        if (apptStartMin < bEnd && apptEndMin > bStart) return false;
      }

      return true;
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

    await this.profileRepo.recordVisit(clientId, 0);

    await this.eventBus.publish(
      new AppointmentBookedEvent(saved.id, {
        clientId: saved.clientId,
        specialistId: saved.specialistId,
        locationId: saved.locationId,
        startAt: saved.startAt.toISOString(),
        endAt: saved.endAt.toISOString(),
        services: saved.services.map(s => ({
          serviceId: s.serviceId,
          name: s.name,
          price: s.price.amount,
        })),
        totalPrice: saved.totalPrice.amount,
      })
    );

    return { appointment: saved, discountApplied };
  }
}
