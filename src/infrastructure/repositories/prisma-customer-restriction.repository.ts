import { PrismaClient } from '@prisma/client';
import type { ICustomerRestrictionRepository, CustomerRestrictionRecord } from '@/application/ports';

export class PrismaCustomerRestrictionRepository implements ICustomerRestrictionRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByProfile(profileId: string, onlyActive = false): Promise<CustomerRestrictionRecord[]> {
    return this.db.customerRestriction.findMany({
      where: { profileId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    profileId: string;
    type: string;
    description: string;
    validFrom?: Date;
    validUntil?: Date;
  }): Promise<CustomerRestrictionRecord> {
    return this.db.customerRestriction.create({
      data: {
        profileId: data.profileId,
        type: data.type,
        description: data.description,
        validFrom: data.validFrom ?? null,
        validUntil: data.validUntil ?? null,
        isActive: true,
      },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.db.customerRestriction.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
