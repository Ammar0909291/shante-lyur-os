import { PrismaClient } from '@prisma/client';
import { ILoyaltyRepository } from '@/application/ports';
import { LoyaltyTransaction } from '@/domain/entities';
import { LoyaltyTransactionType } from '@/domain/enums';

const TIER_THRESHOLDS = [
  { tier: 'PLATINUM', minSpent: 200_000, minVisits: 50 },
  { tier: 'GOLD',     minSpent: 100_000, minVisits: 25 },
  { tier: 'SILVER',   minSpent: 50_000,  minVisits: 10 },
  { tier: 'BRONZE',   minSpent: 0,       minVisits: 0  },
];

function recalculateTier(totalSpent: number, totalVisits: number): string {
  for (const threshold of TIER_THRESHOLDS) {
    if (totalSpent >= threshold.minSpent || totalVisits >= threshold.minVisits) {
      return threshold.tier;
    }
  }
  return 'BRONZE';
}

function toDomain(raw: {
  id: string;
  profileId: string;
  appointmentId: string | null;
  type: string;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdBy: string | null;
  createdAt: Date;
}): LoyaltyTransaction {
  return new LoyaltyTransaction({
    id: raw.id,
    profileId: raw.profileId,
    appointmentId: raw.appointmentId ?? undefined,
    type: raw.type as LoyaltyTransactionType,
    points: raw.points,
    balanceBefore: raw.balanceBefore,
    balanceAfter: raw.balanceAfter,
    description: raw.description ?? undefined,
    createdBy: raw.createdBy ?? undefined,
    createdAt: raw.createdAt,
  });
}

export class PrismaLoyaltyRepository implements ILoyaltyRepository {
  constructor(private readonly db: PrismaClient) {}

  async createTransaction(tx: LoyaltyTransaction): Promise<LoyaltyTransaction> {
    const raw = await this.db.loyaltyTransaction.create({
      data: {
        id: tx.id,
        profileId: tx.profileId,
        appointmentId: tx.appointmentId,
        type: tx.type,
        points: tx.points,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        createdBy: tx.createdBy,
      },
    });
    return toDomain(raw);
  }

  async findTransactionsByProfile(
    profileId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ items: LoyaltyTransaction[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const [raws, total] = await Promise.all([
      this.db.loyaltyTransaction.findMany({
        where: { profileId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.loyaltyTransaction.count({ where: { profileId } }),
    ]);
    return { items: raws.map(toDomain), total };
  }

  async addPoints(
    profileId: string,
    points: number,
    type: LoyaltyTransactionType,
    description?: string,
    appointmentId?: string,
    createdBy?: string,
  ): Promise<{ newBalance: number; tier: string }> {
    return this.db.$transaction(async (tx) => {
      const profile = await tx.customerProfile.findUnique({
        where: { id: profileId },
        select: { loyaltyPoints: true, loyaltyTier: true, totalSpent: true, totalVisits: true },
      });
      if (!profile) throw new Error(`CustomerProfile ${profileId} not found`);

      const balanceBefore = profile.loyaltyPoints;
      const balanceAfter = balanceBefore + points;
      const newTier = recalculateTier(Number(profile.totalSpent), profile.totalVisits);

      await tx.customerProfile.update({
        where: { id: profileId },
        data: { loyaltyPoints: balanceAfter, loyaltyTier: newTier },
      });

      await tx.loyaltyTransaction.create({
        data: {
          profileId,
          appointmentId,
          type,
          points,
          balanceBefore,
          balanceAfter,
          description,
          createdBy,
        },
      });

      return { newBalance: balanceAfter, tier: newTier };
    });
  }

  async deductPoints(
    profileId: string,
    points: number,
    type: LoyaltyTransactionType,
    description?: string,
    appointmentId?: string,
    createdBy?: string,
  ): Promise<{ newBalance: number }> {
    return this.db.$transaction(async (tx) => {
      const profile = await tx.customerProfile.findUnique({
        where: { id: profileId },
        select: { loyaltyPoints: true },
      });
      if (!profile) throw new Error(`CustomerProfile ${profileId} not found`);
      if (profile.loyaltyPoints < points) {
        throw new Error(`Insufficient loyalty points: have ${profile.loyaltyPoints}, need ${points}`);
      }

      const balanceBefore = profile.loyaltyPoints;
      const balanceAfter = balanceBefore - points;

      await tx.customerProfile.update({
        where: { id: profileId },
        data: { loyaltyPoints: balanceAfter },
      });

      await tx.loyaltyTransaction.create({
        data: {
          profileId,
          appointmentId,
          type,
          points: -points,
          balanceBefore,
          balanceAfter,
          description,
          createdBy,
        },
      });

      return { newBalance: balanceAfter };
    });
  }

  async getBalance(profileId: string): Promise<{ points: number; tier: string }> {
    const raw = await this.db.customerProfile.findUnique({
      where: { id: profileId },
      select: { loyaltyPoints: true, loyaltyTier: true },
    });
    if (!raw) throw new Error(`CustomerProfile ${profileId} not found`);
    return { points: raw.loyaltyPoints, tier: raw.loyaltyTier };
  }

  async claimReferralReward(referralId: string): Promise<void> {
    await this.db.referral.update({
      where: { id: referralId },
      data: { rewardClaimed: true, claimedAt: new Date() },
    });
  }

  async getPendingReferralRewards(profileId: string): Promise<Array<{
    referralId: string;
    code: string;
    rewardType: string | null;
    rewardValue: number | null;
  }>> {
    const referrals = await this.db.referral.findMany({
      where: { referrerId: profileId, rewardClaimed: false },
    });
    return referrals.map(r => ({
      referralId: r.id,
      code: r.code,
      rewardType: r.rewardType,
      rewardValue: r.rewardValue !== null ? Number(r.rewardValue) : null,
    }));
  }
}
