import { PrismaClient, Prisma } from '@prisma/client';
import { ILocationRepository } from '@/application/ports/location-repository.port';
import { Location } from '@/domain/entities/location.entity';

type RawLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaLocationRepository implements ILocationRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: RawLocation): Location {
    return new Location({
      id: raw.id,
      name: raw.name,
      address: raw.address,
      city: raw.city,
      phone: raw.phone ?? undefined,
      email: raw.email ?? undefined,
      timezone: raw.timezone,
      isActive: raw.isActive,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Location | null> {
    const raw = await this.db.location.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawLocation) : null;
  }

  async findMany(options: { isActive?: boolean; page?: number; limit?: number }): Promise<{ items: Location[]; total: number }> {
    const { isActive, page = 1, limit = 50 } = options;
    const where: Prisma.LocationWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [raws, total] = await Promise.all([
      this.db.location.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.location.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawLocation)), total };
  }

  async findAll(): Promise<Location[]> {
    const raws = await this.db.location.findMany({ orderBy: { sortOrder: 'asc' } });
    return raws.map(r => this.toDomain(r as unknown as RawLocation));
  }

  async create(location: Location): Promise<Location> {
    const raw = await this.db.location.create({
      data: {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone,
        isActive: location.isActive,
        sortOrder: location.sortOrder,
      },
    });
    return this.toDomain(raw as unknown as RawLocation);
  }

  async update(location: Location): Promise<Location> {
    const raw = await this.db.location.update({
      where: { id: location.id },
      data: {
        name: location.name,
        address: location.address,
        city: location.city,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone,
        isActive: location.isActive,
        sortOrder: location.sortOrder,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as unknown as RawLocation);
  }

  async delete(id: string): Promise<void> {
    await this.db.location.delete({ where: { id } });
  }
}
