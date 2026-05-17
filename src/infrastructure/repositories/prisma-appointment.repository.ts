import { PrismaClient, Prisma, Appointment as PrismaAppointment } from '@prisma/client';
import { AppointmentRepositoryPort } from '@/application/ports/appointment-repository.port';
import { Appointment } from '@/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { CancellationReason } from '@/domain/enums/cancellation-reason.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaAppointmentRepository implements AppointmentRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaAppointment & { customer?: { id: string; firstName: string; lastName: string; email: string } | null; specialist?: { id: string; firstName: string; lastName: string } | null; service?: { id: string; name: string; durationMinutes: number } | null }): Appointment {
    return Appointment.reconstitute({
      id: raw.id,
      customerId: raw.customerId,
      specialistId: raw.specialistId,
      serviceId: raw.serviceId,
      locationId: raw.locationId,
      startAt: raw.startAt,
      endAt: raw.endAt,
      status: raw.status as AppointmentStatus,
      price: Money.create(raw.price).getValue(),
      finalPrice: raw.finalPrice ? Money.create(raw.finalPrice).getValue() : undefined,
      discountAmount: raw.discountAmount ? Money.create(raw.discountAmount).getValue() : undefined,
      discountType: raw.discountType ?? undefined,
      promoCodeId: raw.promoCodeId ?? undefined,
      notes: raw.notes ?? undefined,
      cancellationReason: raw.cancellationReason as CancellationReason ?? undefined,
      cancelledBy: raw.cancelledBy ?? undefined,
      cancelledAt: raw.cancelledAt ?? undefined,
      noShowMarkedAt: raw.noShowMarkedAt ?? undefined,
      noShowMarkedBy: raw.noShowMarkedBy ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Appointment | null> {
    const raw = await this.db.appointment.findUnique({
      where: { id },
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByDateRange(start: Date, end: Date, filters?: { specialistId?: string; locationId?: string; status?: AppointmentStatus[] }): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      startAt: { gte: start, lte: end },
    };
    if (filters?.specialistId) where.specialistId = filters.specialistId;
    if (filters?.locationId) where.locationId = filters.locationId;
    if (filters?.status?.length) where.status = { in: filters.status };

    const raws = await this.db.appointment.findMany({
      where,
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
      orderBy: { startAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findByCustomerId(customerId: string, page?: number, limit?: number): Promise<{ items: Appointment[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const [raws, total] = await Promise.all([
      this.db.appointment.findMany({
        where: { customerId },
        include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
        orderBy: { startAt: 'desc' },
        skip,
        take,
      }),
      this.db.appointment.count({ where: { customerId } }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async findBySpecialistId(specialistId: string, start: Date, end: Date): Promise<Appointment[]> {
    const raws = await this.db.appointment.findMany({
      where: { specialistId, startAt: { gte: start, lte: end } },
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
      orderBy: { startAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findOverlapping(specialistId: string, startAt: Date, endAt: Date, excludeId?: string): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      specialistId,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      AND: [
        { startAt: { lt: endAt } },
        { endAt: { gt: startAt } },
      ],
    };
    if (excludeId) where.id = { not: excludeId };

    const raws = await this.db.appointment.findMany({
      where,
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(appointment: Appointment): Promise<Appointment> {
    const raw = await this.db.appointment.create({
      data: {
        id: appointment.id,
        customerId: appointment.customerId,
        specialistId: appointment.specialistId,
        serviceId: appointment.serviceId,
        locationId: appointment.locationId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        price: appointment.price,
        finalPrice: appointment.finalPrice,
        discountAmount: appointment.discountAmount,
        discountType: appointment.discountType,
        promoCodeId: appointment.promoCodeId,
        notes: appointment.notes,
      },
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
    });
    return this.toDomain(raw);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const raw = await this.db.appointment.update({
      where: { id: appointment.id },
      data: {
        customerId: appointment.customerId,
        specialistId: appointment.specialistId,
        serviceId: appointment.serviceId,
        locationId: appointment.locationId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        price: appointment.price,
        finalPrice: appointment.finalPrice,
        discountAmount: appointment.discountAmount,
        discountType: appointment.discountType,
        promoCodeId: appointment.promoCodeId,
        notes: appointment.notes,
        cancellationReason: appointment.cancellationReason,
        cancelledBy: appointment.cancelledBy,
        cancelledAt: appointment.cancelledAt,
        noShowMarkedAt: appointment.noShowMarkedAt,
        noShowMarkedBy: appointment.noShowMarkedBy,
        updatedAt: new Date(),
      },
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } }, specialist: { select: { id: true, firstName: true, lastName: true } }, service: { select: { id: true, name: true, durationMinutes: true } } },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.appointment.delete({ where: { id } });
  }
}
