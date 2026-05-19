import { PrismaClient, Prisma } from '@prisma/client';
import { ServiceRepositoryPort } from '@/application/ports/service-repository.port';
import { Service } from '@/domain/entities/service.entity';
import { ServiceCategory } from '@/domain/enums/service-category.enum';
import { Money } from '@/domain/value-objects/money.vo';

type PrismaService = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: Prisma.Decimal;
  baseDuration: number;
  imageUrl: string | null;
  isActive: boolean;
  requiresConsultation: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaServiceRepository implements ServiceRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaService): Service {
    return new Service({
      id: raw.id,
      name: raw.name,
      description: raw.description ?? undefined,
      category: raw.category as ServiceCategory,
      basePrice: Money.create(Number(raw.basePrice)),
      baseDuration: raw.baseDuration,
      imageUrl: raw.imageUrl ?? undefined,
      isActive: raw.isActive,
      requiresConsultation: raw.requiresConsultation,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Service | null> {
    const raw = await this.db.service.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByIds(ids: string[]): Promise<Service[]> {
    const raws = await this.db.service.findMany({ where: { id: { in: ids } } });
    return raws.map(r => this.toDomain(r));
  }

  async findMany(options: {
    category?: ServiceCategory;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Service[]; total: number }> {
    const { category, isActive, search, page = 1, limit = 50 } = options;
    const where: Prisma.ServiceWhereInput = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [raws, total] = await Promise.all([
      this.db.service.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
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
        basePrice: service.basePrice.amount,
        baseDuration: service.baseDuration,
        imageUrl: service.imageUrl,
        isActive: service.isActive,
        requiresConsultation: service.requiresConsultation,
        sortOrder: service.sortOrder,
      },
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
        basePrice: service.basePrice.amount,
        baseDuration: service.baseDuration,
        imageUrl: service.imageUrl,
        isActive: service.isActive,
        requiresConsultation: service.requiresConsultation,
        sortOrder: service.sortOrder,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.service.delete({ where: { id } });
  }

  async getLocationPrice(serviceId: string, locationId: string): Promise<{ price: number; duration: number } | null> {
    const row = await this.db.serviceLocationPrice.findUnique({
      where: { serviceId_locationId: { serviceId, locationId } },
      select: { price: true, duration: true },
    });
    if (!row) return null;
    return { price: Number(row.price), duration: row.duration };
  }

  async setLocationPrice(serviceId: string, locationId: string, price: number, duration: number): Promise<void> {
    await this.db.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId, locationId } },
      create: { serviceId, locationId, price, duration },
      update: { price, duration, updatedAt: new Date() },
    });
  }
}
