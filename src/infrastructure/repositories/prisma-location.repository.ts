import { PrismaClient } from '@prisma/client';
import { LocationRepositoryPort } from '@/application/ports/location-repository.port';
import { Location } from '@/domain/entities/location.entity';
import { PhoneNumber } from '@/domain/value-objects/phone-number.vo';

export class PrismaLocationRepository implements LocationRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; name: string; address: string; phone: string | null; email: string | null; timezone: string; isActive: boolean; createdAt: Date; updatedAt: Date }): Location {
    return Location.reconstitute({
      id: raw.id,
      name: raw.name,
      address: raw.address,
      phone: raw.phone ? PhoneNumber.create(raw.phone).getValue() : undefined,
      email: raw.email ?? undefined,
      timezone: raw.timezone,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<Location | null> {
    const raw = await this.db.location.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAll(): Promise<Location[]> {
    const raws = await this.db.location.findMany({ orderBy: { name: 'asc' } });
    return raws.map(r => this.toDomain(r));
  }

  async create(location: Location): Promise<Location> {
    const raw = await this.db.location.create({
      data: {
        id: location.id,
        name: location.name,
        address: location.address,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone,
        isActive: location.isActive,
      },
    });
    return this.toDomain(raw);
  }

  async update(location: Location): Promise<Location> {
    const raw = await this.db.location.update({
      where: { id: location.id },
      data: {
        name: location.name,
        address: location.address,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone,
        isActive: location.isActive,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.location.delete({ where: { id } });
  }
}
