import { PrismaClient, Prisma } from '@prisma/client';
import { ICustomerProfileRepository } from '@/application/ports/customer-profile-repository.port';
import { CustomerProfile } from '@/domain/entities/customer-profile.entity';
import { Money } from '@/domain/value-objects/money.vo';

type CustomerProfileRow = {
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
  totalSpent: Prisma.Decimal;
  loyaltyPoints: number;
  loyaltyTier: string;
  churnRiskScore: Prisma.Decimal | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaCustomerProfileRepository implements ICustomerProfileRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: CustomerProfileRow): CustomerProfile {
    return new CustomerProfile({
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
      totalSpent: Money.create(Number(raw.totalSpent)),
      loyaltyPoints: raw.loyaltyPoints,
      loyaltyTier: raw.loyaltyTier,
      churnRiskScore: raw.churnRiskScore ? Number(raw.churnRiskScore) : undefined,
      notes: raw.notes ?? undefined,
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
        dateOfBirth: profile.dateOfBirth ?? null,
        gender: profile.gender ?? null,
        skinType: profile.skinType ?? null,
        hairType: profile.hairType ?? null,
        bodyType: profile.bodyType ?? null,
        preferredLocationId: profile.preferredLocationId ?? null,
        preferredSpecialistId: profile.preferredSpecialistId ?? null,
        referralSource: profile.referralSource ?? null,
        firstVisitAt: profile.firstVisitAt ?? null,
        lastVisitAt: profile.lastVisitAt ?? null,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent.amount,
        loyaltyPoints: profile.loyaltyPoints,
        loyaltyTier: profile.loyaltyTier,
        churnRiskScore: profile.churnRiskScore ?? null,
        notes: profile.notes ?? null,
      },
    });
    return this.toDomain(raw);
  }

  async update(profile: CustomerProfile): Promise<CustomerProfile> {
    const raw = await this.db.customerProfile.update({
      where: { id: profile.id },
      data: {
        dateOfBirth: profile.dateOfBirth ?? null,
        gender: profile.gender ?? null,
        skinType: profile.skinType ?? null,
        hairType: profile.hairType ?? null,
        bodyType: profile.bodyType ?? null,
        preferredLocationId: profile.preferredLocationId ?? null,
        preferredSpecialistId: profile.preferredSpecialistId ?? null,
        referralSource: profile.referralSource ?? null,
        lastVisitAt: profile.lastVisitAt ?? null,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent.amount,
        loyaltyPoints: profile.loyaltyPoints,
        loyaltyTier: profile.loyaltyTier,
        churnRiskScore: profile.churnRiskScore ?? null,
        notes: profile.notes ?? null,
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
      },
    });
  }

  async updateChurnRisk(userId: string, score: number): Promise<void> {
    await this.db.customerProfile.update({
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
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [totalCustomers, activeLastMonth, highChurnRisk, avgLtv] = await Promise.all([
      this.db.customerProfile.count(),
      this.db.customerProfile.count({ where: { lastVisitAt: { gte: oneMonthAgo } } }),
      this.db.customerProfile.count({ where: { churnRiskScore: { gte: 0.7 } } }),
      this.db.customerProfile.aggregate({ _avg: { totalSpent: true } }),
    ]);

    return {
      totalCustomers,
      activeCustomers: activeLastMonth,
      atRiskCustomers: highChurnRisk,
      avgLifetimeValue: Number(avgLtv._avg.totalSpent ?? 0),
    };
  }
}
