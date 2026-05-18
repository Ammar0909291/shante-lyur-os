import { ClientMembership } from '@/domain/entities';
import { MembershipStatus } from '@/domain/enums';
import { NotFoundError, ConflictError } from '@/domain/errors';
import {
  IMembershipPlanRepository,
  IClientMembershipRepository,
  ICustomerProfileRepository,
  ILoyaltyRepository,
} from '@/application/ports';
import { PurchaseMembershipDto } from '@/application/dto';
import { LoyaltyTransactionType } from '@/domain/enums';

export class PurchaseMembershipUseCase {
  constructor(
    private readonly planRepo: IMembershipPlanRepository,
    private readonly membershipRepo: IClientMembershipRepository,
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly loyaltyRepo: ILoyaltyRepository,
  ) {}

  async execute(dto: PurchaseMembershipDto): Promise<ClientMembership> {
    const plan = await this.planRepo.findById(dto.planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundError('MembershipPlan', dto.planId);
    }

    const stats = await this.profileRepo.getLoyaltyStats(dto.profileId);
    if (!stats) {
      throw new NotFoundError('CustomerProfile', dto.profileId);
    }

    const existing = await this.membershipRepo.findActiveByProfileId(dto.profileId);
    if (existing) {
      throw new ConflictError('Клиент уже имеет активное членство');
    }

    const now = new Date();
    const renewsAt = plan.nextRenewalDate(now);

    const membership = new ClientMembership({
      id: crypto.randomUUID(),
      profileId: dto.profileId,
      planId: dto.planId,
      status: MembershipStatus.ACTIVE,
      startedAt: now,
      renewsAt,
      sessionsUsed: 0,
      autoRenew: dto.autoRenew,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.membershipRepo.create(membership);

    if (plan.bonusPointsPerPeriod > 0) {
      await this.loyaltyRepo.addPoints(
        dto.profileId,
        plan.bonusPointsPerPeriod,
        LoyaltyTransactionType.MEMBERSHIP_BONUS,
        `Бонус за подписку: ${plan.name}`,
      );
    }

    return saved;
  }
}
