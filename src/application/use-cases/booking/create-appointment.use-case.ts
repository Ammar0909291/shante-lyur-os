import { Appointment, AppointmentServiceItem } from '@/domain/entities';
import { AppointmentStatus, UserRole } from '@/domain/enums';
import { DateRange, Money } from '@/domain/value-objects';
import { NotFoundError, ForbiddenError, ConflictError } from '@/domain/errors';
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
    actorRole: UserRole
  ): Promise<CreateAppointmentResult> {
    if (actorRole === UserRole.CLIENT && dto.clientId !== undefined && dto.clientId !== clientId) {
      throw new ForbiddenError('Clients can only book for themselves');
    }

    const specialist = await this.specialistRepo.findById(dto.specialistId);
    if (!specialist || !specialist.isActive) {
      throw new NotFoundError('Specialist', dto.specialistId);
    }

    const location = await this.locationRepo.findById(dto.locationId);
    if (!location || !location.isActive) {
      throw new NotFoundError('Location', dto.locationId);
    }

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

    let totalDuration = 0;
    let totalPrice = Money.zero('RUB');
    const appointmentServices: AppointmentServiceItem[] = [];

    for (let idx = 0; idx < dto.services.length; idx++) {
      const svcDto = dto.services[idx];
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

    // For massage specialists, apply a 30-minute buffer after each existing appointment.
    // We expand the search range backwards by the buffer so that existing appointments
    // ending within the buffer window before our start are detected as conflicts.
    const specLower = (specialist.specialization ?? '').toLowerCase();
    const isMassage =
      specLower.includes('массаж') ||
      specLower.includes('massage') ||
      specLower.includes('spa') ||
      specLower.includes('спа');

    const MASSAGE_BUFFER_MS = 30 * 60_000;
    const checkRange = isMassage
      ? DateRange.create(new Date(dto.startAt.getTime() - MASSAGE_BUFFER_MS), endAt)
      : timeRange;

    const overlapping = await this.appointmentRepo.findOverlapping(specialist.id, checkRange);
    if (overlapping.length > 0) {
      const bufferNote = isMassage ? ` (правило: +30 мин. перерыв после массажа)` : '';
      throw new ConflictError(`Time slot is not available${bufferNote}`, 'startAt');
    }

    const blocked = await this.blockedTimeRepo.findOverlapping(specialist.id, timeRange);
    if (blocked.length > 0) {
      throw new ConflictError('Specialist is not available at this time', 'startAt');
    }

    const vacations = await this.vacationRepo.findActiveVacations(specialist.id, dto.startAt);
    if (vacations.length > 0) {
      throw new ConflictError('Specialist is on vacation', 'startAt');
    }

    // Schedules store times in Yekaterinburg time (UTC+5). Convert startAt from UTC to local
    // before comparing so "10:00 YEKT" stored as 05:00 UTC is handled correctly.
    const MOSCOW_OFFSET_MS = 5 * 3600_000;
    const moscowStart = new Date(dto.startAt.getTime() + MOSCOW_OFFSET_MS);
    const moscowEnd   = new Date(endAt.getTime()       + MOSCOW_OFFSET_MS);
    const dayOfWeek   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][moscowStart.getUTCDay()] as never;
    const schedules   = await this.workingScheduleRepo.findBySpecialistAndDay(specialist.id, dayOfWeek);
    const validSchedule = schedules.find(s => {
      if (!s.isActive || !s.isValidForDate(dto.startAt)) return false;
      const apptStartMin = moscowStart.getUTCHours() * 60 + moscowStart.getUTCMinutes();
      const apptEndMin   = moscowEnd.getUTCHours()   * 60 + moscowEnd.getUTCMinutes();
      return apptStartMin >= s.startMinutes && apptEndMin <= s.endMinutes;
    });
    if (!validSchedule) {
      throw new ConflictError('Outside working hours', 'startAt');
    }

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

    await this.profileRepo.recordVisit(clientId, 0).catch(() => {});

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
