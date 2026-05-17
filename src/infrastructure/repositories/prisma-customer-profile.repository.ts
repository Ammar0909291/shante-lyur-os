import { PrismaClient, Prisma } from '@prisma/client';
import { ICustomerProfileRepository } from '@/application/ports/customer-profile-repository.port';
import { CustomerProfile, CustomerProfileProps } from '@/domain/entities/customer-profile.entity';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaCustomerProfileRepository implements ICustomerProfileRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string;
    dateOfBirth: Date | null;
    gender: string | null;
    skinType: string | null;
    hairType: string | null;
    bodyType: string | null;
    preferredLocationId: string | null;
    preferredSpecialistId: string | null;
    referralSource: string | null;
    firstVisitAt: Date | null;
    lastVisitAt: Date | null;
    totalVisits: number;
    totalSpent: { toNumber(): number };
    loyaltyPoints: number;
    loyaltyTier: string;
    churnRiskScore: { toNumber(): number } | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerProfile {
    const props: CustomerProfileProps = {
      id: raw.id,
      userId: raw.userId,
      dateOfBirth: raw.dateOfBirth ?? undefined,
      gender: raw.gender ?? undefined,
      skinType: raw.skinType ?? undefined,
      hairType: raw.hairType ?? undefined,
      bodyType: raw.bodyType ?? undefined,
      preferredLocationId: raw.preferredLocationId ?? undefined,
      preferredSpecialistId: raw.preferredSpecialistId ?? undefined,
      referralSource: raw.referralSource ?? undefined,
      firstVisitAt: raw.firstVisitAt ?? undefined,
      lastVisitAt: raw.lastVisitAt ?? undefined,
      totalVisits: raw.totalVisits,
      totalSpent: Money.create(raw.totalSpent.toNumber()),
      loyaltyPoints: raw.loyaltyPoints,
      loyaltyTier: raw.loyaltyTier,
      churnRiskScore: raw.churnRiskScore != null ? raw.churnRiskScore.toNumber() : undefined,
      notes: raw.notes ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
    return new CustomerProfile(props);
  }

  async findById(id: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: {
    search?: string;
    loyaltyTier?: string;
    minVisits?: number;
    maxChurnRisk?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: CustomerProfile[]; total: number }> {
    const { loyaltyTier, minVisits, maxChurnRisk, page = 1, limit = 20 } = options;
    const where: Prisma.CustomerProfileWhereInput = {};
    if (loyaltyTier) where.loyaltyTier = loyaltyTier;
    if (minVisits != null) where.totalVisits = { gte: minVisits };
    if (maxChurnRisk != null) where.churnRiskScore = { lte: maxChurnRisk };

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
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        skinType: profile.skinType,
        hairType: profile.hairType,
        bodyType: profile.bodyType,
        preferredLocationId: profile.preferredLocationId,
        preferredSpecialistId: profile.preferredSpecialistId,
        referralSource: profile.referralSource,
        firstVisitAt: profile.firstVisitAt,
        lastVisitAt: profile.lastVisitAt,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent.amount,
        loyaltyPoints: profile.loyaltyPoints,
        loyaltyTier: profile.loyaltyTier,
        churnRiskScore: profile.churnRiskScore,
        notes: profile.notes,
      },
    });
    return this.toDomain(raw);
  }

  async update(profile: CustomerProfile): Promise<CustomerProfile> {
    const raw = await this.db.customerProfile.update({
      where: { id: profile.id },
      data: {
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        skinType: profile.skinType,
        hairType: profile.hairType,
        bodyType: profile.bodyType,
        preferredLocationId: profile.preferredLocationId,
        preferredSpecialistId: profile.preferredSpecialistId,
        referralSource: profile.referralSource,
        firstVisitAt: profile.firstVisitAt,
        lastVisitAt: profile.lastVisitAt,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent.amount,
        loyaltyPoints: profile.loyaltyPoints,
        loyaltyTier: profile.loyaltyTier,
        churnRiskScore: profile.churnRiskScore,
        notes: profile.notes,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.customerProfile.delete({ where: { id } });
  }

  async recordVisit(userId: string, amount: number): Promise<void> {
    await this.db.customerProfile.update({
      where: { userId },
      data: {
        totalVisits: { increment: 1 },
        totalSpent: { increment: amount },
        lastVisitAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateChurnRisk(userId: string, score: number): Promise<void> {
    await this.db.customerProfile.update({
      where: { userId },
      data: {
        churnRiskScore: score,
        updatedAt: new Date(),
      },
    });
  }

  async getRetentionMetrics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    atRiskCustomers: number;
    avgLifetimeValue: number;
  }> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [totalCustomers, activeCustomers, atRiskCustomers, aggregate] = await Promise.all([
      this.db.customerProfile.count(),
      this.db.customerProfile.count({
        where: { lastVisitAt: { gte: ninetyDaysAgo } },
      }),
      this.db.customerProfile.count({
        where: { churnRiskScore: { gt: 0.7 } },
      }),
      this.db.customerProfile.aggregate({
        _avg: { totalSpent: true },
      }),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      atRiskCustomers,
      avgLifetimeValue: Number(aggregate._avg.totalSpent ?? 0),
    };
  }
}
