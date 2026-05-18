import { PrismaClient, Prisma } from '@prisma/client';
import { ISpecialistRepository } from '@/application/ports/specialist-repository.port';
import { Specialist } from '@/domain/entities/specialist.entity';
import { SpecialistStatus } from '@/domain/enums/specialist-status.enum';
import { Color } from '@/domain/value-objects/color.vo';

type RawSpecialist = {
  id: string;
  userId: string;
  bio: string | null;
  specialization: string | null;
  experienceYears: number | null;
  rating: { toNumber(): number } | null;
  reviewCount: number;
  commissionRate: { toNumber(): number };
  status: string;
  color: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaSpecialistRepository implements ISpecialistRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: RawSpecialist): Specialist {
    return Specialist.reconstitute({
      id: raw.id,
      userId: raw.userId,
      bio: raw.bio ?? undefined,
      specialization: raw.specialization ?? undefined,
      experienceYears: raw.experienceYears ?? undefined,
      rating: raw.rating ? raw.rating.toNumber() : undefined,
      reviewCount: raw.reviewCount,
      commissionRate: raw.commissionRate.toNumber(),
      status: raw.status as SpecialistStatus,
      color: raw.color ? Color.create(raw.color) : undefined,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawSpecialist) : null;
  }

  async findByUserId(userId: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw as unknown as RawSpecialist) : null;
  }

  async findMany(options?: {
    status?: SpecialistStatus;
    serviceId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Specialist[]; total: number }> {
    const { status, serviceId, page = 1, limit = 50 } = options ?? {};
    const where: Prisma.SpecialistWhereInput = {};
    if (status) where.status = status;
    if (serviceId) where.services = { some: { serviceId } };

    const [raws, total] = await Promise.all([
      this.db.specialist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.specialist.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawSpecialist)), total };
  }

  async create(specialist: Specialist): Promise<Specialist> {
    const raw = await this.db.specialist.create({
      data: {
        id: specialist.id,
        userId: specialist.userId,
        bio: specialist.bio,
        specialization: specialist.specialization,
        experienceYears: specialist.experienceYears,
        commissionRate: specialist.commissionRate,
        status: specialist.status,
        color: specialist.color?.value,
        sortOrder: specialist.sortOrder,
      },
    });
    return this.toDomain(raw as unknown as RawSpecialist);
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
        status: specialist.status,
        color: specialist.color?.value,
        sortOrder: specialist.sortOrder,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as unknown as RawSpecialist);
  }

  async delete(id: string): Promise<void> {
    await this.db.specialist.delete({ where: { id } });
  }

  async updateRating(specialistId: string, newRating: number): Promise<void> {
    await this.db.specialist.update({
      where: { id: specialistId },
      data: { rating: newRating, updatedAt: new Date() },
    });
  }

  async assignService(specialistId: string, serviceId: string, priceOverride?: number, durationOverride?: number): Promise<void> {
    await this.db.specialistService.upsert({
      where: { specialistId_serviceId: { specialistId, serviceId } },
      create: { specialistId, serviceId, priceOverride, durationOverride },
      update: { priceOverride, durationOverride },
    });
  }

  async removeService(specialistId: string, serviceId: string): Promise<void> {
    await this.db.specialistService.delete({
      where: { specialistId_serviceId: { specialistId, serviceId } },
    });
  }
}
