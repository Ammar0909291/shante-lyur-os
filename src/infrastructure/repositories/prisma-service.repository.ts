import { PrismaClient, Prisma } from '@prisma/client';
import { ServiceRepositoryPort } from '@/application/ports/service-repository.port';
import { Service } from '@/domain/entities/service.entity';
import { ServiceCategory } from '@/domain/enums/service-category.enum';
import { Money } from '@/domain/value-objects/money.vo';
import { Color } from '@/domain/value-objects/color.vo';

export class PrismaServiceRepository implements ServiceRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; name: string; description: string | null; category: string; durationMinutes: number; basePrice: number; color: string | null; isActive: boolean; requiresConsultation: boolean; createdAt: Date; updatedAt: Date } & { locations?: { locationId: string; price: number }[] }): Service {
    return Service.reconstitute({
      id: raw.id,
      name: raw.name,
      description: raw.description ?? undefined,
      category: raw.category as ServiceCategory,
      durationMinutes: raw.durationMinutes,
      basePrice: Money.create(raw.basePrice).getValue(),
      color: raw.color ? Color.create(raw.color).getValue() : undefined,
      isActive: raw.isActive,
      requiresConsultation: raw.requiresConsultation,
      locationPrices: raw.locations?.map(l => ({ locationId: l.locationId, price: Money.create(l.price).getValue() })) ?? [],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Service | null> {
    const raw = await this.db.service.findUnique({
      where: { id },
      include: { locations: { select: { locationId: true, price: true } } },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options?: { category?: ServiceCategory; isActive?: boolean; search?: string; page?: number; limit?: number }): Promise<{ items: Service[]; total: number }> {
    const { category, isActive, search, page = 1, limit = 50 } = options ?? {};
    const where: Prisma.ServiceWhereInput = {};
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [raws, total] = await Promise.all([
      this.db.service.findMany({
        where,
        include: { locations: { select: { locationId: true, price: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.db.service.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(service: Service): Promise<Service> {
    const raw = await this.db.service.create({
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        durationMinutes: service.durationMinutes,
        basePrice: service.basePrice,
        color: service.color,
        isActive: service.isActive,
        requiresConsultation: service.requiresConsultation,
        locations: service.locationPrices.length > 0 ? {
          create: service.locationPrices.map(lp => ({
            locationId: lp.locationId,
            price: lp.price,
          })),
        } : undefined,
      },
      include: { locations: { select: { locationId: true, price: true } } },
    });
    return this.toDomain(raw);
  }

  async update(service: Service): Promise<Service> {
    const raw = await this.db.service.update({
      where: { id: service.id },
      data: {
        name: service.name,
        description: service.description,
        category: service.category,
        durationMinutes: service.durationMinutes,
        basePrice: service.basePrice,
        color: service.color,
        isActive: service.isActive,
        requiresConsultation: service.requiresConsultation,
        updatedAt: new Date(),
      },
      include: { locations: { select: { locationId: true, price: true } } },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.service.delete({ where: { id } });
  }
}
