import { PrismaClient, Prisma } from '@prisma/client';
import { SpecialistRepositoryPort } from '@/application/ports/specialist-repository.port';
import { Specialist } from '@/domain/entities/specialist.entity';
import { SpecialistStatus } from '@/domain/enums/specialist-status.enum';

export class PrismaSpecialistRepository implements SpecialistRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(raw: any): Specialist {
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
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options?: {
    status?: SpecialistStatus;
    serviceId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Specialist[]; total: number }> {
    const { status, serviceId, locationId, page = 1, limit = 50 } = options ?? {};
    const where: Prisma.SpecialistWhereInput = {};
    if (status) where.status = status;
    if (serviceId) where.services = { some: { serviceId } };
    if (locationId) where.workingSchedules = { some: { locationId } };

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
        status: specialist.status,
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
        status: specialist.status,
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
      data: { rating: newRating, reviewCount: { increment: 1 } },
    });
  }

  async assignService(
    specialistId: string,
    serviceId: string,
    priceOverride?: number,
    durationOverride?: number,
  ): Promise<void> {
    await this.db.specialistService.upsert({
      where: { specialistId_serviceId: { specialistId, serviceId } },
      create: {
        specialistId,
        serviceId,
        priceOverride,
        durationOverride,
      },
      update: {
        priceOverride,
        durationOverride,
      },
    });
  }

  async removeService(specialistId: string, serviceId: string): Promise<void> {
    await this.db.specialistService.delete({
      where: { specialistId_serviceId: { specialistId, serviceId } },
    });
  }
}
