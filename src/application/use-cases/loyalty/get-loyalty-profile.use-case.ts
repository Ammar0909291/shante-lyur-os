import { ILoyaltyRepository, ICustomerProfileRepository } from '@/application/ports';
import { NotFoundError } from '@/domain/errors';

const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

const TIER_THRESHOLDS: Record<string, { minSpent: number; minVisits: number }> = {
  BRONZE:   { minSpent: 0,         minVisits: 0  },
  SILVER:   { minSpent: 50_000,    minVisits: 10 },
  GOLD:     { minSpent: 100_000,   minVisits: 25 },
  PLATINUM: { minSpent: 200_000,   minVisits: 50 },
};

export interface LoyaltyProfileResult {
  profileId: string;
  points: number;
  tier: string;
  tierLabel: string;
  nextTier: string | null;
  progressToNextTier: number;
  totalSpent: number;
  totalVisits: number;
  firstVisitAt: Date | null;
  lastVisitAt: Date | null;
  daysSinceLastVisit: number | null;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  recentTransactions: Array<{
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    description?: string;
    createdAt: Date;
  }>;
  pendingReferralRewards: Array<{
    referralId: string;
    code: string;
    rewardValue: number | null;
  }>;
}

export class GetLoyaltyProfileUseCase {
  constructor(
    private readonly loyaltyRepo: ILoyaltyRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(profileId: string): Promise<LoyaltyProfileResult> {
    const stats = await this.profileRepo.getLoyaltyStats(profileId);
    if (!stats) {
      throw new NotFoundError('CustomerProfile', profileId);
    }

    const txResult = await this.loyaltyRepo.findTransactionsByProfile(profileId, { limit: 10 });
    const pendingRewards = await this.loyaltyRepo.getPendingReferralRewards(profileId);

    const tierIndex = TIER_ORDER.indexOf(stats.tier);
    const nextTierName = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : null;

    let progressToNextTier = 100;
    if (nextTierName) {
      const current = TIER_THRESHOLDS[stats.tier];
      const next = TIER_THRESHOLDS[nextTierName];
      const spentProgress = next.minSpent > 0
        ? Math.min(100, ((stats.totalSpent - current.minSpent) / (next.minSpent - current.minSpent)) * 100)
        : 100;
      const visitsProgress = next.minVisits > 0
        ? Math.min(100, ((stats.totalVisits - current.minVisits) / (next.minVisits - current.minVisits)) * 100)
        : 100;
      progressToNextTier = Math.max(spentProgress, visitsProgress);
    }

    let churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' | null = null;
    if (stats.churnRiskScore !== null) {
      if (stats.churnRiskScore >= 0.7) churnRisk = 'HIGH';
      else if (stats.churnRiskScore >= 0.4) churnRisk = 'MEDIUM';
      else churnRisk = 'LOW';
    }

    let daysSinceLastVisit: number | null = null;
    if (stats.lastVisitAt) {
      daysSinceLastVisit = Math.floor((Date.now() - stats.lastVisitAt.getTime()) / 86_400_000);
    }

    const tierLabels: Record<string, string> = {
      BRONZE: 'Бронза',
      SILVER: 'Серебро',
      GOLD: 'Золото',
      PLATINUM: 'Платина',
    };

    return {
      profileId,
      points: stats.points,
      tier: stats.tier,
      tierLabel: tierLabels[stats.tier] ?? stats.tier,
      nextTier: nextTierName,
      progressToNextTier: Math.round(progressToNextTier),
      totalSpent: stats.totalSpent,
      totalVisits: stats.totalVisits,
      firstVisitAt: stats.firstVisitAt,
      lastVisitAt: stats.lastVisitAt,
      daysSinceLastVisit,
      churnRisk,
      recentTransactions: txResult.items.map(tx => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
      pendingReferralRewards: pendingRewards.map(r => ({
        referralId: r.referralId,
        code: r.code,
        rewardValue: r.rewardValue,
      })),
    };
  }
}
