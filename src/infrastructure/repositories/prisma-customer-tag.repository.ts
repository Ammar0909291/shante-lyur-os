import { PrismaClient } from '@prisma/client';
import type { ICustomerTagRepository, CustomerTagRecord } from '@/application/ports';

export class PrismaCustomerTagRepository implements ICustomerTagRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByProfile(profileId: string): Promise<CustomerTagRecord[]> {
    return this.db.customerTag.findMany({
      where: { profileId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: { profileId: string; tag: string; color?: string }): Promise<CustomerTagRecord> {
    return this.db.customerTag.create({
      data: {
        profileId: data.profileId,
        tag: data.tag,
        color: data.color ?? null,
      },
    });
  }

  async delete(profileId: string, tag: string): Promise<void> {
    await this.db.customerTag.deleteMany({ where: { profileId, tag } });
  }
}
