import { PrismaClient, Prisma } from '@prisma/client';
import { IAppointmentRepository } from '@/application/ports/appointment-repository.port';
import { Appointment, AppointmentServiceItem } from '@/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { CancellationReason } from '@/domain/enums/cancellation-reason.enum';
import { DateRange } from '@/domain/value-objects/date-range.vo';
import { Money } from '@/domain/value-objects/money.vo';

type AppointmentServiceRow = {
  serviceId: string;
  price: { toNumber(): number } | number;
  duration: number;
  sortOrder: number;
  service: { name: string };
};

type AppointmentRow = {
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
  services: AppointmentServiceRow[];
};

const WITH_SERVICES = {
  services: {
    include: { service: { select: { name: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.AppointmentInclude;

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: AppointmentRow): Appointment {
    const totalPrice = typeof raw.totalPrice === 'number'
      ? raw.totalPrice
      : raw.totalPrice.toNumber();

    const services: AppointmentServiceItem[] = raw.services.map(s => ({
      serviceId: s.serviceId,
      name: s.service.name,
      price: Money.create(typeof s.price === 'number' ? s.price : s.price.toNumber()),
      duration: s.duration,
      sortOrder: s.sortOrder,
    }));

    return new Appointment({
      id: raw.id,
      clientId: raw.clientId,
      specialistId: raw.specialistId,
      locationId: raw.locationId,
      timeSlot: DateRange.create(raw.startAt, raw.endAt),
      status: raw.status as AppointmentStatus,
      services,
      totalPrice: Money.create(totalPrice),
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
      include: WITH_SERVICES,
    });
    return raw ? this.toDomain(raw as AppointmentRow) : null;
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
      if (from) where.startAt.gte = from;
      if (to) where.startAt.lte = to;
    }

    const [raws, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        include: WITH_SERVICES,
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.appointment.count({ where }),
    ]);

    return { items: raws.map(r => this.toDomain(r as AppointmentRow)), total };
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
      include: WITH_SERVICES,
    });
    return raws.map(r => this.toDomain(r as AppointmentRow));
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
        notes: appointment.notes ?? null,
        source: appointment.source ?? null,
        services: {
          create: appointment.services.map(s => ({
            id: crypto.randomUUID(),
            serviceId: s.serviceId,
            price: s.price.amount,
            duration: s.duration,
            sortOrder: s.sortOrder,
          })),
        },
      },
      include: WITH_SERVICES,
    });
    return this.toDomain(raw as AppointmentRow);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const raw = await this.db.appointment.update({
      where: { id: appointment.id },
      data: {
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        totalPrice: appointment.totalPrice.amount,
        totalDuration: appointment.totalDuration,
        notes: appointment.notes ?? null,
        cancellationReason: appointment.cancellationReason ?? null,
        cancelledAt: appointment.cancelledAt ?? null,
        cancelledBy: appointment.cancelledBy ?? null,
        noShowAt: appointment.noShowAt ?? null,
        checkedInAt: appointment.checkedInAt ?? null,
        checkedOutAt: appointment.checkedOutAt ?? null,
        updatedAt: new Date(),
      },
      include: WITH_SERVICES,
    });
    return this.toDomain(raw as AppointmentRow);
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
