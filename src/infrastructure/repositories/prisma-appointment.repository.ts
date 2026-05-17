import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { IAppointmentRepository } from '@/application/ports/appointment-repository.port';
import { Appointment, AppointmentServiceItem } from '@/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { CancellationReason } from '@/domain/enums/cancellation-reason.enum';
import { DateRange } from '@/domain/value-objects/date-range.vo';
import { Money } from '@/domain/value-objects/money.vo';
import { SlotUnavailableError } from '@/domain/errors/conflict-error';

const APPOINTMENT_INCLUDE = {
  services: {
    include: { service: { select: { name: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
};

const INACTIVE_STATUSES: string[] = [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly db: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(raw: any): Appointment {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const services: AppointmentServiceItem[] = (raw.services ?? []).map((svc: any) => ({
      serviceId: svc.serviceId,
      name: svc.service.name,
      price: Money.create(Number(svc.price)),
      duration: svc.duration,
      sortOrder: svc.sortOrder,
    }));

    return new Appointment({
      id: raw.id,
      clientId: raw.clientId,
      specialistId: raw.specialistId,
      locationId: raw.locationId,
      timeSlot: DateRange.create(raw.startAt as Date, raw.endAt as Date),
      status: raw.status as AppointmentStatus,
      services,
      totalPrice: Money.create(Number(raw.totalPrice)),
      totalDuration: raw.totalDuration as number,
      notes: raw.notes ?? undefined,
      cancellationReason: (raw.cancellationReason as CancellationReason) ?? undefined,
      cancelledAt: raw.cancelledAt ?? undefined,
      cancelledBy: raw.cancelledBy ?? undefined,
      noShowAt: raw.noShowAt ?? undefined,
      checkedInAt: raw.checkedInAt ?? undefined,
      checkedOutAt: raw.checkedOutAt ?? undefined,
      source: raw.source ?? undefined,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    });
  }

  async findById(id: string): Promise<Appointment | null> {
    const raw = await this.db.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
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
    const where: Record<string, unknown> = {};
    if (options.clientId) where['clientId'] = options.clientId;
    if (options.specialistId) where['specialistId'] = options.specialistId;
    if (options.locationId) where['locationId'] = options.locationId;
    if (options.status) {
      where['status'] = Array.isArray(options.status)
        ? { in: options.status }
        : options.status;
    }
    if (options.from || options.to) {
      where['startAt'] = {
        ...(options.from ? { gte: options.from } : {}),
        ...(options.to ? { lte: options.to } : {}),
      };
    }

    const skip = options.page && options.limit ? (options.page - 1) * options.limit : undefined;
    const take = options.limit;

    const [raws, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        orderBy: { startAt: 'desc' },
        skip,
        take,
      }),
      this.db.appointment.count({ where }),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (raws as any[]).map((r) => this.toDomain(r)),
      total: total as number,
    };
  }

  async findOverlapping(
    specialistId: string,
    timeRange: DateRange,
    excludeId?: string,
  ): Promise<Appointment[]> {
    const where: Record<string, unknown> = {
      specialistId,
      status: { notIn: INACTIVE_STATUSES },
      AND: [
        { startAt: { lt: timeRange.end } },
        { endAt: { gt: timeRange.start } },
      ],
    };
    if (excludeId) where['id'] = { not: excludeId };

    const raws = await this.db.appointment.findMany({ where, include: APPOINTMENT_INCLUDE });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raws as any[]).map((r) => this.toDomain(r));
  }

  async create(appointment: Appointment): Promise<Appointment> {
    try {
      const raw = await this.db.$transaction(
        async (tx: PrismaClient) => {
          const conflicts: number = await tx.appointment.count({
            where: {
              specialistId: appointment.specialistId,
              status: { notIn: INACTIVE_STATUSES },
              AND: [
                { startAt: { lt: appointment.endAt } },
                { endAt: { gt: appointment.startAt } },
              ],
            },
          });
          if (conflicts > 0) {
            throw new SlotUnavailableError();
          }

          return tx.appointment.create({
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
                create: appointment.services.map((svc) => ({
                  serviceId: svc.serviceId,
                  price: svc.price.amount,
                  duration: svc.duration,
                  sortOrder: svc.sortOrder,
                })),
              },
            },
            include: APPOINTMENT_INCLUDE,
          });
        },
        { isolationLevel: 'Serializable' },
      );

      return this.toDomain(raw);
    } catch (e) {
      if (e instanceof SlotUnavailableError) throw e;
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2034') {
        throw new SlotUnavailableError();
      }
      throw e;
    }
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
        cancelledBy: appointment.cancelledBy ?? null,
        cancelledAt: appointment.cancelledAt ?? null,
        noShowAt: appointment.noShowAt ?? null,
        checkedInAt: appointment.checkedInAt ?? null,
        checkedOutAt: appointment.checkedOutAt ?? null,
        updatedAt: new Date(),
      },
      include: APPOINTMENT_INCLUDE,
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
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    return this.db.appointment.count({
      where: {
        specialistId,
        startAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: INACTIVE_STATUSES },
      },
    });
  }
}
