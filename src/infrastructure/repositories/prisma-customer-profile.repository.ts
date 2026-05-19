import { PrismaClient, Prisma } from '@prisma/client';
import { ICustomerProfileRepository } from '@/application/ports/customer-profile-repository.port';
import { CustomerProfile } from '@/domain/entities/customer-profile.entity';
import { Money } from '@/domain/value-objects/money.vo';

type RawCustomerProfile = {
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
  totalSpent: number | { toNumber(): number };
  loyaltyPoints: number;
  loyaltyTier: string;
  churnRiskScore: number | { toNumber(): number } | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaCustomerProfileRepository implements ICustomerProfileRepository {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: number | { toNumber(): number }): number {
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawCustomerProfile): CustomerProfile {
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
      totalSpent: Money.create(this.toNum(raw.totalSpent)),
      loyaltyPoints: raw.loyaltyPoints,
      loyaltyTier: raw.loyaltyTier,
      churnRiskScore: raw.churnRiskScore != null ? this.toNum(raw.churnRiskScore as number | { toNumber(): number }) : undefined,
      notes: raw.notes ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawCustomerProfile) : null;
  }

  async findByUserId(userId: string): Promise<CustomerProfile | null> {
    const raw = await this.db.customerProfile.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw as unknown as RawCustomerProfile) : null;
  }

  async findMany(options: {
    search?: string;
    loyaltyTier?: string;
    minVisits?: number;
    maxChurnRisk?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: CustomerProfile[]; total: number }> {
    const { search, loyaltyTier, minVisits, maxChurnRisk, page = 1, limit = 20 } = options;
    const where: Prisma.CustomerProfileWhereInput = {};
    if (loyaltyTier) where.loyaltyTier = loyaltyTier;
    if (minVisits !== undefined) where.totalVisits = { gte: minVisits };
    if (maxChurnRisk !== undefined) where.churnRiskScore = { lte: maxChurnRisk };
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
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
    return { items: raws.map(r => this.toDomain(r as unknown as RawCustomerProfile)), total };
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
    return this.toDomain(raw as unknown as RawCustomerProfile);
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
    return this.toDomain(raw as unknown as RawCustomerProfile);
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
    const [totalCustomers, activeCustomers, atRiskCustomers, aggregate] = await Promise.all([
      this.db.customerProfile.count(),
      this.db.customerProfile.count({ where: { lastVisitAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } }),
      this.db.customerProfile.count({ where: { churnRiskScore: { gte: 0.7 } } }),
      this.db.customerProfile.aggregate({ _avg: { totalSpent: true } }),
    ]);
    const avgSpent = aggregate._avg.totalSpent;
    const avgLifetimeValue = avgSpent ? this.toNum(avgSpent as unknown as number | { toNumber(): number }) : 0;
    return { totalCustomers, activeCustomers, atRiskCustomers, avgLifetimeValue };
  }
}
