import { PrismaClient, Prisma } from '@prisma/client';
import { CustomerProfileRepositoryPort } from '@/application/ports/customer-profile-repository.port';
import { CustomerProfile } from '@/domain/entities/customer-profile.entity';
import { PhoneNumber } from '@/domain/value-objects/phone-number.vo';

export class PrismaCustomerProfileRepository implements CustomerProfileRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; userId: string | null; firstName: string; lastName: string; phone: string | null; email: string | null; dateOfBirth: Date | null; gender: string | null; skinType: string | null; hairType: string | null; notes: string | null; source: string | null; totalVisits: number; totalSpent: number; lastVisitAt: Date | null; createdAt: Date; updatedAt: Date }): CustomerProfile {
    return CustomerProfile.reconstitute({
      id: raw.id,
      userId: raw.userId ?? undefined,
      firstName: raw.firstName,
      lastName: raw.lastName,
      phone: raw.phone ? PhoneNumber.create(raw.phone).getValue() : undefined,
      email: raw.email ?? undefined,
      dateOfBirth: raw.dateOfBirth ?? undefined,
      gender: raw.gender ?? undefined,
      skinType: raw.skinType ?? undefined,
      hairType: raw.hairType ?? undefined,
      notes: raw.notes ?? undefined,
      source: raw.source ?? undefined,
      totalVisits: raw.totalVisits,
      totalSpent: raw.totalSpent,
      lastVisitAt: raw.lastVisitAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByPhone(phone: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { phone } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: { search?: string; page?: number; limit?: number }): Promise<{ items: CustomerProfile[]; total: number }> {
    const { search, page = 1, limit = 20 } = options;
    const where: Prisma.CustomerProfileWhereInput = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [raws, total] = await Promise.all([
      this.db.customerProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.customerProfile.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(profile: CustomerProfile): Promise<CustomerProfile> {
    const raw = await this.db.customerProfile.create({
      data: {
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        email: profile.email,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        skinType: profile.skinType,
        hairType: profile.hairType,
        notes: profile.notes,
        source: profile.source,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent,
        lastVisitAt: profile.lastVisitAt,
      },
    });
    return this.toDomain(raw);
  }

  async update(profile: CustomerProfile): Promise<CustomerProfile> {
    const raw = await this.db.customerProfile.update({
      where: { id: profile.id },
      data: {
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        email: profile.email,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        skinType: profile.skinType,
        hairType: profile.hairType,
        notes: profile.notes,
        source: profile.source,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent,
        lastVisitAt: profile.lastVisitAt,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.customerProfile.delete({ where: { id } });
  }

  async incrementVisits(id: string, amount: number): Promise<void> {
    await this.db.customerProfile.update({
      where: { id },
      data: { totalVisits: { increment: 1 }, totalSpent: { increment: amount }, lastVisitAt: new Date() },
    });
  }

  async recordVisit(userId: string, amount: number): Promise<void> {
    await this.db.customerProfile.updateMany({
      where: { userId },
      data: {
        totalVisits: { increment: 1 },
        totalSpent: { increment: amount },
        lastVisitAt: new Date(),
      },
    });
  }

  async updateChurnRisk(userId: string, score: number): Promise<void> {
    await this.db.customerProfile.updateMany({
      where: { userId },
      data: { churnRiskScore: score },
    });
  }

  async getRetentionMetrics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    atRiskCustomers: number;
    avgLifetimeValue: number;
  }> {
    const [total, active, atRisk, avgSpent] = await Promise.all([
      this.db.customerProfile.count(),
      this.db.customerProfile.count({
        where: { lastVisitAt: { gte: new Date(Date.now() - 90 * 86_400_000) } },
      }),
      this.db.customerProfile.count({
        where: { churnRiskScore: { gte: 0.7 } },
      }),
      this.db.customerProfile.aggregate({ _avg: { totalSpent: true } }),
    ]);

    return {
      totalCustomers: total,
      activeCustomers: active,
      atRiskCustomers: atRisk,
      avgLifetimeValue: Number(avgSpent._avg.totalSpent ?? 0),
    };
  }

  async getLoyaltyStats(profileId: string): Promise<{
    points: number;
    tier: string;
    totalSpent: number;
    totalVisits: number;
    firstVisitAt: Date | null;
    lastVisitAt: Date | null;
    churnRiskScore: number | null;
  } | null> {
    const raw = await this.db.customerProfile.findUnique({
      where: { id: profileId },
      select: {
        loyaltyPoints: true,
        loyaltyTier: true,
        totalSpent: true,
        totalVisits: true,
        firstVisitAt: true,
        lastVisitAt: true,
        churnRiskScore: true,
      },
    });
    if (!raw) return null;
    return {
      points: raw.loyaltyPoints,
      tier: raw.loyaltyTier,
      totalSpent: Number(raw.totalSpent),
      totalVisits: raw.totalVisits,
      firstVisitAt: raw.firstVisitAt,
      lastVisitAt: raw.lastVisitAt,
      churnRiskScore: raw.churnRiskScore !== null ? Number(raw.churnRiskScore) : null,
    };
  }
}
