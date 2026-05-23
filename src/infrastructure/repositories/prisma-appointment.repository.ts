import { PrismaClient, Prisma, AppointmentService as PrismaAppointmentService } from '@prisma/client';
import { AppointmentRepositoryPort } from '@/application/ports/appointment-repository.port';
import { Appointment, AppointmentServiceItem } from '@/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { CancellationReason } from '@/domain/enums/cancellation-reason.enum';
import { Money } from '@/domain/value-objects/money.vo';
import { DateRange } from '@/domain/value-objects/date-range.vo';

type AppointmentWithServices = {
  id: string;
  clientId: string;
  specialistId: string;
  locationId: string;
  startAt: Date;
  endAt: Date;
  status: string;
  totalPrice: { toNumber(): number } | number;
  totalDuration: number;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  noShowAt: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  services: (PrismaAppointmentService & { service?: { name: string } | null })[];
};

const INCLUDE = {
  services: {
    include: {
      service: { select: { name: true } },
    },
  },
} as const;

export class PrismaAppointmentRepository implements AppointmentRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: AppointmentWithServices): Appointment {
    const services: AppointmentServiceItem[] = raw.services.map(s => ({
      serviceId: s.serviceId,
      name: s.service?.name ?? '',
      price: Money.create(
        typeof s.price === 'number' ? s.price : (s.price as { toNumber(): number }).toNumber()
      ),
      duration: s.duration,
      sortOrder: s.sortOrder,
    }));

    const totalPriceNum = typeof raw.totalPrice === 'number'
      ? raw.totalPrice
      : (raw.totalPrice as { toNumber(): number }).toNumber();

    return Appointment.reconstitute({
      id: raw.id,
      clientId: raw.clientId,
      specialistId: raw.specialistId,
      locationId: raw.locationId,
      timeSlot: DateRange.create(raw.startAt, raw.endAt),
      status: raw.status as AppointmentStatus,
      services,
      totalPrice: Money.create(totalPriceNum),
      totalDuration: raw.totalDuration,
      notes: raw.notes ?? undefined,
      cancellationReason: raw.cancellationReason as CancellationReason ?? undefined,
      cancelledAt: raw.cancelledAt ?? undefined,
      cancelledBy: raw.cancelledBy ?? undefined,
      noShowAt: raw.noShowAt ?? undefined,
      checkedInAt: raw.checkedInAt ?? undefined,
      checkedOutAt: raw.checkedOutAt ?? undefined,
      source: raw.source ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Appointment | null> {
    const raw = await this.db.appointment.findUnique({
      where: { id },
      include: INCLUDE,
    });
    return raw ? this.toDomain(raw as AppointmentWithServices) : null;
  }

  async findMany(options: {
    clientId?: string;
    specialistId?: string;
    locationId?: string;
    status?: AppointmentStatus | AppointmentStatus[];
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: Appointment[]; total: number }> {
    const where: Prisma.AppointmentWhereInput = {};
    if (options.clientId) where.clientId = options.clientId;
    if (options.specialistId) where.specialistId = options.specialistId;
    if (options.locationId) where.locationId = options.locationId;
    if (options.status) {
      where.status = Array.isArray(options.status)
        ? { in: options.status }
        : options.status;
    }
    if (options.from || options.to) {
      where.startAt = {};
      if (options.from) where.startAt.gte = options.from;
      if (options.to) where.startAt.lte = options.to;
    }

    const skip = options.page && options.limit ? (options.page - 1) * options.limit : undefined;
    const take = options.limit;

    const [raws, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        include: INCLUDE,
        orderBy: { startAt: 'desc' },
        skip,
        take,
      }),
      this.db.appointment.count({ where }),
    ]);

    return { items: raws.map(r => this.toDomain(r as AppointmentWithServices)), total };
  }

  async findOverlapping(specialistId: string, timeRange: DateRange, excludeId?: string): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      specialistId,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      AND: [
        { startAt: { lt: timeRange.end } },
        { endAt: { gt: timeRange.start } },
      ],
    };
    if (excludeId) where.id = { not: excludeId };

    const raws = await this.db.appointment.findMany({ where, include: INCLUDE });
    return raws.map(r => this.toDomain(r as AppointmentWithServices));
  }

  async findByDateRange(start: Date, end: Date, filters?: { specialistId?: string; locationId?: string; status?: AppointmentStatus[] }): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      startAt: { gte: start, lte: end },
    };
    if (filters?.specialistId) where.specialistId = filters.specialistId;
    if (filters?.locationId) where.locationId = filters.locationId;
    if (filters?.status?.length) where.status = { in: filters.status };

    const raws = await this.db.appointment.findMany({ where, include: INCLUDE, orderBy: { startAt: 'asc' } });
    return raws.map(r => this.toDomain(r as AppointmentWithServices));
  }

  async findByCustomerId(customerId: string, page?: number, limit?: number): Promise<{ items: Appointment[]; total: number }> {
    return this.findMany({ clientId: customerId, page, limit });
  }

  async create(appointment: Appointment): Promise<Appointment> {
    const raw = await this.db.appointment.create({
      data: {
        id: appointment.id,
        clientId: appointment.clientId,
        specialistId: appointment.specialistId,
        locationId: appointment.locationId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        totalPrice: appointment.totalPrice.amount,
        totalDuration: appointment.totalDuration,
        notes: appointment.notes,
        source: appointment.source,
        services: {
          create: appointment.services.map(s => ({
            serviceId: s.serviceId,
            price: s.price.amount,
            duration: s.duration,
            sortOrder: s.sortOrder,
          })),
        },
      },
      include: INCLUDE,
    });
    return this.toDomain(raw as AppointmentWithServices);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    // Delete and recreate services
    await this.db.appointmentService.deleteMany({ where: { appointmentId: appointment.id } });

    const raw = await this.db.appointment.update({
      where: { id: appointment.id },
      data: {
        clientId: appointment.clientId,
        specialistId: appointment.specialistId,
        locationId: appointment.locationId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        totalPrice: appointment.totalPrice.amount,
        totalDuration: appointment.totalDuration,
        notes: appointment.notes,
        cancellationReason: appointment.cancellationReason,
        cancelledBy: appointment.cancelledBy,
        cancelledAt: appointment.cancelledAt,
        noShowAt: appointment.noShowAt,
        checkedInAt: appointment.checkedInAt,
        checkedOutAt: appointment.checkedOutAt,
        source: appointment.source,
        updatedAt: new Date(),
        services: {
          create: appointment.services.map(s => ({
            serviceId: s.serviceId,
            price: s.price.amount,
            duration: s.duration,
            sortOrder: s.sortOrder,
          })),
        },
      },
      include: INCLUDE,
    });
    return this.toDomain(raw as AppointmentWithServices);
  }

  async delete(id: string): Promise<void> {
    await this.db.appointment.delete({ where: { id } });
  }

  async countByStatus(status: AppointmentStatus): Promise<number> {
    return this.db.appointment.count({ where: { status } });
  }

  async countBySpecialistAndDate(specialistId: string, date: Date): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.db.appointment.count({
      where: {
        specialistId,
        startAt: { gte: start, lte: end },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
    });
  }
}
