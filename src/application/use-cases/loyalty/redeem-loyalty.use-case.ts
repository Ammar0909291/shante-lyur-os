import { ILoyaltyRepository, ICustomerProfileRepository } from '@/application/ports';
import { LoyaltyTransactionType } from '@/domain/enums';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { RedeemLoyaltyDto } from '@/application/dto';

// 100 points = 100 rubles = 10,000 kopeks
const KOPEKS_PER_POINT = 100;

export interface RedeemLoyaltyResult {
  pointsRedeemed: number;
  discountKopeks: number;
  newBalance: number;
}

export class RedeemLoyaltyUseCase {
  constructor(
    private readonly loyaltyRepo: ILoyaltyRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(dto: RedeemLoyaltyDto, actorId: string): Promise<RedeemLoyaltyResult> {
    const stats = await this.profileRepo.getLoyaltyStats(dto.profileId);
    if (!stats) {
      throw new NotFoundError('CustomerProfile', dto.profileId);
    }

    if (stats.points < dto.pointsToRedeem) {
      throw new ValidationError(
        `Недостаточно баллов. Доступно: ${stats.points}, запрошено: ${dto.pointsToRedeem}`,
      );
    }

    const result = await this.loyaltyRepo.deductPoints(
      dto.profileId,
      dto.pointsToRedeem,
      LoyaltyTransactionType.REDEEM,
      dto.description ?? `Списание баллов`,
      dto.appointmentId,
      actorId,
    );

    const discountKopeks = dto.pointsToRedeem * KOPEKS_PER_POINT;

    return {
      pointsRedeemed: dto.pointsToRedeem,
      discountKopeks,
      newBalance: result.newBalance,
    };
  }
}
