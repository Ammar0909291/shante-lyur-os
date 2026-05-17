import { PrismaClient, Prisma } from '@prisma/client';
import { SpecialistRepositoryPort } from '@/application/ports/specialist-repository.port';
import { Specialist } from '@/domain/entities/specialist.entity';
import { SpecialistStatus } from '@/domain/enums/specialist-status.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaSpecialistRepository implements SpecialistRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; userId: string; bio: string | null; specialties: string[]; commissionRate: number; rating: number; reviewCount: number; status: string; maxDailyAppointments: number; createdAt: Date; updatedAt: Date } & { user?: { firstName: string; lastName: string; email: string } | null }): Specialist {
    return Specialist.reconstitute({
      id: raw.id,
      userId: raw.userId,
      bio: raw.bio ?? undefined,
      specialties: raw.specialties,
      commissionRate: raw.commissionRate,
      rating: raw.rating,
      reviewCount: raw.reviewCount,
      status: raw.status as SpecialistStatus,
      maxDailyAppointments: raw.maxDailyAppointments,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({
      where: { id },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<Specialist | null> {
    const raw = await this.db.specialist.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options?: { status?: SpecialistStatus; page?: number; limit?: number }): Promise<{ items: Specialist[]; total: number }> {
    const { status, page = 1, limit = 50 } = options ?? {};
    const where: Prisma.SpecialistWhereInput = {};
    if (status) where.status = status;

    const [raws, total] = await Promise.all([
      this.db.specialist.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
        specialties: specialist.specialties,
        commissionRate: specialist.commissionRate,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        status: specialist.status,
        maxDailyAppointments: specialist.maxDailyAppointments,
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return this.toDomain(raw);
  }

  async update(specialist: Specialist): Promise<Specialist> {
    const raw = await this.db.specialist.update({
      where: { id: specialist.id },
      data: {
        bio: specialist.bio,
        specialties: specialist.specialties,
        commissionRate: specialist.commissionRate,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        status: specialist.status,
        maxDailyAppointments: specialist.maxDailyAppointments,
        updatedAt: new Date(),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.specialist.delete({ where: { id } });
  }
}
