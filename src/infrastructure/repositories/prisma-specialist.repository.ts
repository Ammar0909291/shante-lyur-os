import { PrismaClient, Prisma } from '@prisma/client';
import { ISpecialistRepository } from '@/application/ports/specialist-repository.port';
import { Specialist } from '@/domain/entities/specialist.entity';
import { SpecialistStatus } from '@/domain/enums/specialist-status.enum';
import { Color } from '@/domain/value-objects/color.vo';

type SpecialistWithUser = Prisma.SpecialistGetPayload<{
  include: { user: { select: { firstName: true; lastName: true; email: true } } };
}>;

export class PrismaSpecialistRepository implements ISpecialistRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: SpecialistWithUser): Specialist {
    return Specialist.reconstitute({
      id: raw.id,
      userId: raw.userId,
      bio: raw.bio ?? undefined,
      specialization: raw.specialization ?? undefined,
      experienceYears: raw.experienceYears ?? undefined,
      rating: raw.rating !== null ? Number(raw.rating) : undefined,
      reviewCount: raw.reviewCount,
      commissionRate: Number(raw.commissionRate),
      status: raw.status as SpecialistStatus,
      color: raw.color ? Color.create(raw.color) : undefined,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  private readonly includeUser = {
    user: { select: { firstName: true, lastName: true, email: true } },
  } as const;

  async findById(id: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({
      where: { id },
      include: this.includeUser,
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({
      where: { userId },
      include: this.includeUser,
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: {
    status?: SpecialistStatus;
    serviceId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Specialist[]; total: number }> {
    const { status, serviceId, page = 1, limit = 50 } = options;

    const where: Prisma.SpecialistWhereInput = {};
    if (status) where.status = status;
    if (serviceId) {
      where.services = { some: { serviceId, isActive: true } };
    }

    const [raws, total] = await Promise.all([
      this.db.specialist.findMany({
        where,
        include: this.includeUser,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.db.specialist.count({ where }),
    ]);

    return { items: raws.map((r) => this.toDomain(r)), total };
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
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        status: specialist.status,
        color: specialist.color?.value,
        sortOrder: specialist.sortOrder,
      },
      include: this.includeUser,
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
        commissionRate: specialist.commissionRate,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        status: specialist.status,
        color: specialist.color?.value,
        sortOrder: specialist.sortOrder,
        updatedAt: new Date(),
      },
      include: this.includeUser,
    });
    return this.toDomain(raw);
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

  async assignService(
    specialistId: string,
    serviceId: string,
    priceOverride?: number,
    durationOverride?: number,
  ): Promise<void> {
    await this.db.specialistService.upsert({
      where: { specialistId_serviceId: { specialistId, serviceId } },
      create: { specialistId, serviceId, priceOverride, durationOverride, isActive: true },
      update: { priceOverride, durationOverride, isActive: true },
    });
  }

  async removeService(specialistId: string, serviceId: string): Promise<void> {
    await this.db.specialistService.updateMany({
      where: { specialistId, serviceId },
      data: { isActive: false },
    });
  }
}
