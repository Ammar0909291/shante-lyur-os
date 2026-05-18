import { ILoyaltyRepository, ICustomerProfileRepository } from '@/application/ports';
import { LoyaltyTransactionType } from '@/domain/enums';
import { NotFoundError } from '@/domain/errors';

// 1 point per 100 rubles. Amounts stored as kopeks (×100).
const KOPEKS_PER_POINT = 10_000;

const TIER_MULTIPLIERS: Record<string, number> = {
  BRONZE: 1.0,
  SILVER: 1.25,
  GOLD: 1.5,
  PLATINUM: 2.0,
};

export class AccumulateLoyaltyUseCase {
  constructor(
    private readonly loyaltyRepo: ILoyaltyRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(params: {
    profileId: string;
    amountKopeks: number;
    appointmentId: string;
  }): Promise<{ pointsEarned: number; newBalance: number; tier: string }> {
    const stats = await this.profileRepo.getLoyaltyStats(params.profileId);
    if (!stats) {
      throw new NotFoundError('CustomerProfile', params.profileId);
    }

    const multiplier = TIER_MULTIPLIERS[stats.tier] ?? 1.0;
    const basePoints = Math.floor(params.amountKopeks / KOPEKS_PER_POINT);
    const pointsEarned = Math.round(basePoints * multiplier);

    if (pointsEarned <= 0) {
      return { pointsEarned: 0, newBalance: stats.points, tier: stats.tier };
    }

    const result = await this.loyaltyRepo.addPoints(
      params.profileId,
      pointsEarned,
      LoyaltyTransactionType.EARN,
      `Начислено за визит`,
      params.appointmentId,
    );

    return { pointsEarned, newBalance: result.newBalance, tier: result.tier };
  }
}
