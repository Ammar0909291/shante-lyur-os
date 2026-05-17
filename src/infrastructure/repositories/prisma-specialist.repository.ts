import { PrismaClient, Prisma, SpecialistStatus as PrismaSpecialistStatus } from '@prisma/client';
import { ISpecialistRepository } from '@/application/ports/specialist-repository.port';
import { Specialist, SpecialistProps } from '@/domain/entities/specialist.entity';
import { SpecialistStatus } from '@/domain/enums/specialist-status.enum';
import { Color } from '@/domain/value-objects/color.vo';

export class PrismaSpecialistRepository implements ISpecialistRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string;
    bio: string | null;
    specialization: string | null;
    experienceYears: number | null;
    rating: { toNumber(): number } | null;
    reviewCount: number;
    commissionRate: { toNumber(): number };
    status: PrismaSpecialistStatus;
    color: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): Specialist {
    const props: SpecialistProps = {
      id: raw.id,
      userId: raw.userId,
      bio: raw.bio ?? undefined,
      specialization: raw.specialization ?? undefined,
      experienceYears: raw.experienceYears ?? undefined,
      rating: raw.rating != null ? raw.rating.toNumber() : undefined,
      reviewCount: raw.reviewCount,
      commissionRate: raw.commissionRate.toNumber(),
      status: raw.status as unknown as SpecialistStatus,
      color: raw.color ? Color.create(raw.color) : undefined,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
    return new Specialist(props);
  }

  async findById(id: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: {
    status?: SpecialistStatus;
    serviceId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Specialist[]; total: number }> {
    const { status, serviceId, locationId, page = 1, limit = 50 } = options ?? {};
    const where: Prisma.SpecialistWhereInput = {};
    if (status) where.status = status as unknown as PrismaSpecialistStatus;
    if (serviceId) where.services = { some: { serviceId, isActive: true } };
    if (locationId) where.workingSchedules = { some: { locationId, isActive: true } };

    const [raws, total] = await Promise.all([
      this.db.specialist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.specialist.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(specialist: Specialist): Promise<Specialist> {
    const raw = await this.db.specialist.create({
      data: {
        id: specialist.id,
        userId: specialist.userId,
        bio: specialist.bio,
        specialization: specialist.specialization,
        experienceYears: specialist.experienceYears,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        commissionRate: specialist.commissionRate,
        status: specialist.status as unknown as PrismaSpecialistStatus,
        color: specialist.color?.value,
        sortOrder: specialist.sortOrder,
      },
    });
    return this.toDomain(raw);
  }

  async update(specialist: Specialist): Promise<Specialist> {
    const raw = await this.db.specialist.update({
      where: { id: specialist.id },
      data: {
        bio: specialist.bio,
        specialization: specialist.specialization,
        experienceYears: specialist.experienceYears,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        commissionRate: specialist.commissionRate,
        status: specialist.status as unknown as PrismaSpecialistStatus,
        color: specialist.color?.value,
        sortOrder: specialist.sortOrder,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.specialist.delete({ where: { id } });
  }

  async updateRating(specialistId: string, newRating: number): Promise<void> {
    await this.db.specialist.update({
      where: { id: specialistId },
      data: {
        rating: newRating,
        reviewCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  async assignService(specialistId: string, serviceId: string, priceOverride?: number, durationOverride?: number): Promise<void> {
    await this.db.specialistService.upsert({
      where: { specialistId_serviceId: { specialistId, serviceId } },
      create: {
        specialistId,
        serviceId,
        priceOverride: priceOverride ?? null,
        durationOverride: durationOverride ?? null,
        isActive: true,
      },
      update: {
        priceOverride: priceOverride ?? null,
        durationOverride: durationOverride ?? null,
        isActive: true,
      },
    });
  }

  async removeService(specialistId: string, serviceId: string): Promise<void> {
    await this.db.specialistService.delete({
      where: { specialistId_serviceId: { specialistId, serviceId } },
    });
  }
}
