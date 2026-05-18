import { ILoyaltyRepository, ICustomerProfileRepository } from '@/application/ports';
import { LoyaltyTransactionType } from '@/domain/enums';
import { NotFoundError, ConflictError } from '@/domain/errors';
import { ClaimReferralRewardDto } from '@/application/dto';

export class ClaimReferralRewardUseCase {
  constructor(
    private readonly loyaltyRepo: ILoyaltyRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(dto: ClaimReferralRewardDto): Promise<{ pointsAwarded: number }> {
    const rewards = await this.loyaltyRepo.getPendingReferralRewards(dto.profileId);
    const reward = rewards.find(r => r.referralId === dto.referralId);

    if (!reward) {
      throw new NotFoundError('Referral', dto.referralId);
    }

    if (reward.rewardType !== 'points' || !reward.rewardValue) {
      throw new ConflictError('Reward type not supported for direct point claim');
    }

    const stats = await this.profileRepo.getLoyaltyStats(dto.profileId);
    if (!stats) {
      throw new NotFoundError('CustomerProfile', dto.profileId);
    }

    const points = Math.round(reward.rewardValue);

    await this.loyaltyRepo.addPoints(
      dto.profileId,
      points,
      LoyaltyTransactionType.REFERRAL_BONUS,
      `Реферальный бонус (код: ${reward.code})`,
    );

    await this.loyaltyRepo.claimReferralReward(dto.referralId);

    return { pointsAwarded: points };
  }
}
