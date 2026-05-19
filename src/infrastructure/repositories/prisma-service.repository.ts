import { PrismaClient, Prisma } from '@prisma/client';
import { IServiceRepository } from '@/application/ports/service-repository.port';
import { Service } from '@/domain/entities/service.entity';
import { ServiceCategory } from '@/domain/enums/service-category.enum';
import { Money } from '@/domain/value-objects/money.vo';

type RawService = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number | { toNumber(): number };
  baseDuration: number;
  imageUrl: string | null;
  isActive: boolean;
  requiresConsultation: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  locationPrices?: Array<{ locationId: string; price: number | { toNumber(): number }; duration: number }>;
};

export class PrismaServiceRepository implements IServiceRepository {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: number | { toNumber(): number }): number {
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawService): Service {
    return new Service({
      id: raw.id,
      name: raw.name,
      description: raw.description ?? undefined,
      category: raw.category as ServiceCategory,
      basePrice: Money.create(this.toNum(raw.basePrice)),
      baseDuration: raw.baseDuration,
      imageUrl: raw.imageUrl ?? undefined,
      isActive: raw.isActive,
      requiresConsultation: raw.requiresConsultation,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  private readonly includeLocationPrices = {
    locationPrices: { select: { locationId: true, price: true, duration: true } },
  };

  async findById(id: string): Promise<Service | null> {
    const raw = await this.db.service.findUnique({
      where: { id },
      include: this.includeLocationPrices,
    });
    return raw ? this.toDomain(raw as unknown as RawService) : null;
  }

  async findByIds(ids: string[]): Promise<Service[]> {
    const raws = await this.db.service.findMany({
      where: { id: { in: ids } },
      include: this.includeLocationPrices,
    });
    return raws.map(r => this.toDomain(r as unknown as RawService));
  }

  async findMany(options?: { category?: ServiceCategory; isActive?: boolean; search?: string; page?: number; limit?: number }): Promise<{ items: Service[]; total: number }> {
    const { category, isActive, search, page = 1, limit = 50 } = options ?? {};
    const where: Prisma.ServiceWhereInput = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [raws, total] = await Promise.all([
      this.db.service.findMany({
        where,
        include: this.includeLocationPrices,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.service.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawService)), total };
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
      include: this.includeLocationPrices,
    });
    return this.toDomain(raw as unknown as RawService);
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
      include: this.includeLocationPrices,
    });
    return this.toDomain(raw as unknown as RawService);
  }

  async delete(id: string): Promise<void> {
    await this.db.service.delete({ where: { id } });
  }

  async getLocationPrice(serviceId: string, locationId: string): Promise<{ price: number; duration: number } | null> {
    const raw = await this.db.serviceLocationPrice.findUnique({
      where: { serviceId_locationId: { serviceId, locationId } },
    });
    if (!raw) return null;
    return {
      price: this.toNum(raw.price as unknown as number | { toNumber(): number }),
      duration: raw.duration,
    };
  }

  async setLocationPrice(serviceId: string, locationId: string, price: number, duration: number): Promise<void> {
    await this.db.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId, locationId } },
      create: { serviceId, locationId, price, duration },
      update: { price, duration },
    });
  }
}
