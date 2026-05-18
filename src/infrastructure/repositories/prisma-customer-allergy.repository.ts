import { PrismaClient } from '@prisma/client';
import { IAllergyRepository, AllergyData } from '@/application/ports/allergy-repository.port';

export class PrismaCustomerAllergyRepository implements IAllergyRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string; profileId: string; allergen: string; severity: string;
    reaction: string | null; diagnosedAt: Date | null; createdAt: Date;
  }): AllergyData {
    return {
      id: raw.id,
      profileId: raw.profileId,
      allergen: raw.allergen,
      severity: raw.severity as AllergyData['severity'],
      reaction: raw.reaction,
      diagnosedAt: raw.diagnosedAt,
      createdAt: raw.createdAt,
    };
  }

  async findByProfile(profileId: string): Promise<AllergyData[]> {
    const rows = await this.db.customerAllergy.findMany({
      where: { profileId },
      orderBy: { severity: 'desc' },
    });
    return rows.map(r => this.toDomain(r));
  }

  async findById(id: string): Promise<AllergyData | null> {
    const row = await this.db.customerAllergy.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: Omit<AllergyData, 'createdAt'>): Promise<AllergyData> {
    const row = await this.db.customerAllergy.create({
      data: {
        id: data.id,
        profileId: data.profileId,
        allergen: data.allergen,
        severity: data.severity,
        reaction: data.reaction,
        diagnosedAt: data.diagnosedAt,
      },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.customerAllergy.delete({ where: { id } });
  }
}
