import { PrismaClient } from '@prisma/client';
import type { ICustomerAllergyRepository, CustomerAllergyRecord } from '@/application/ports';

export class PrismaCustomerAllergyRepository implements ICustomerAllergyRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByProfile(profileId: string): Promise<CustomerAllergyRecord[]> {
    return this.db.customerAllergy.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    profileId: string;
    allergen: string;
    severity: string;
    reaction?: string;
    diagnosedAt?: Date;
  }): Promise<CustomerAllergyRecord> {
    return this.db.customerAllergy.create({
      data: {
        profileId: data.profileId,
        allergen: data.allergen,
        severity: data.severity,
        reaction: data.reaction ?? null,
        diagnosedAt: data.diagnosedAt ?? null,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.customerAllergy.delete({ where: { id } });
  }
}
