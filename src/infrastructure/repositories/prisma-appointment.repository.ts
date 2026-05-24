import { PrismaClient, Prisma } from '@prisma/client';
import { IAppointmentRepository } from '@/application/ports/appointment-repository.port';
import { Appointment, AppointmentServiceItem } from '@/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { CancellationReason } from '@/domain/enums/cancellation-reason.enum';
import { Money } from '@/domain/value-objects/money.vo';
import { DateRange } from '@/domain/value-objects/date-range.vo';

type AppointmentWithServices = Prisma.AppointmentGetPayload<{
  include: { services: { include: { service: true } } };
}>;

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: AppointmentWithServices): Appointment {
    const services: AppointmentServiceItem[] = raw.services.map((s) => ({
      serviceId: s.serviceId,
      name: s.service.name,
      price: Money.create(Number(s.price)),
      duration: s.duration,
      sortOrder: s.sortOrder,
    }));

    return Appointment.reconstitute({
      id: raw.id,
      clientId: raw.clientId,
      specialistId: raw.specialistId,
      locationId: raw.locationId,
      startAt: raw.startAt,
      endAt: raw.endAt,
      status: raw.status as AppointmentStatus,
      services,
      totalPrice: Money.create(Number(raw.totalPrice)),
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

  private readonly includeServices = {
    services: { include: { service: true } },
  } as const;

  async findById(id: string): Promise<Appointment | null> {
    const raw = await this.db.appointment.findUnique({
      where: { id },
      include: this.includeServices,
    });
    return raw ? this.toDomain(raw) : null;
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
    const { clientId, specialistId, locationId, status, from, to, page = 1, limit = 50 } = options;

    const where: Prisma.AppointmentWhereInput = {};
    if (clientId) where.clientId = clientId;
    if (specialistId) where.specialistId = specialistId;
    if (locationId) where.locationId = locationId;
    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.startAt as Prisma.DateTimeFilter).lte = to;
    }

    const [raws, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        include: this.includeServices,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.appointment.count({ where }),
    ]);

    return { items: raws.map((r) => this.toDomain(r)), total };
  }

  async findOverlapping(
    specialistId: string,
    timeRange: DateRange,
    excludeId?: string,
  ): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      specialistId,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      AND: [
        { startAt: { lt: timeRange.end } },
        { endAt: { gt: timeRange.start } },
      ],
    };
    if (excludeId) where.id = { not: excludeId };

    const raws = await this.db.appointment.findMany({
      where,
      include: this.includeServices,
    });
    return raws.map((r) => this.toDomain(r));
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
          create: appointment.services.map((s) => ({
            serviceId: s.serviceId,
            price: s.price.amount,
            duration: s.duration,
            sortOrder: s.sortOrder,
          })),
        },
      },
      include: this.includeServices,
    });
    return this.toDomain(raw);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const raw = await this.db.appointment.update({
      where: { id: appointment.id },
      data: {
        specialistId: appointment.specialistId,
        locationId: appointment.locationId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        totalPrice: appointment.totalPrice.amount,
        totalDuration: appointment.totalDuration,
        notes: appointment.notes,
        cancellationReason: appointment.cancellationReason,
        cancelledAt: appointment.cancelledAt,
        cancelledBy: appointment.cancelledBy,
        noShowAt: appointment.noShowAt,
        checkedInAt: appointment.checkedInAt,
        checkedOutAt: appointment.checkedOutAt,
        updatedAt: new Date(),
      },
      include: this.includeServices,
    });
    return this.toDomain(raw);
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
