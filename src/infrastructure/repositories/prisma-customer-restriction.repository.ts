import { PrismaClient } from '@prisma/client';
import { IRestrictionRepository, RestrictionData } from '@/application/ports/restriction-repository.port';

export class PrismaCustomerRestrictionRepository implements IRestrictionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string; profileId: string; type: string; description: string;
    validFrom: Date | null; validUntil: Date | null; isActive: boolean; createdAt: Date;
  }): RestrictionData {
    return {
      id: raw.id,
      profileId: raw.profileId,
      type: raw.type as RestrictionData['type'],
      description: raw.description,
      validFrom: raw.validFrom,
      validUntil: raw.validUntil,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
    };
  }

  async findByProfile(profileId: string, activeOnly = false): Promise<RestrictionData[]> {
    const rows = await this.db.customerRestriction.findMany({
      where: { profileId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toDomain(r));
  }

  async findById(id: string): Promise<RestrictionData | null> {
    const row = await this.db.customerRestriction.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: Omit<RestrictionData, 'createdAt'>): Promise<RestrictionData> {
    const row = await this.db.customerRestriction.create({
      data: {
        id: data.id,
        profileId: data.profileId,
        type: data.type,
        description: data.description,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isActive: data.isActive,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Pick<RestrictionData, 'description' | 'validFrom' | 'validUntil' | 'isActive'>>): Promise<RestrictionData> {
    const row = await this.db.customerRestriction.update({
      where: { id },
      data,
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.customerRestriction.delete({ where: { id } });
  }
}
