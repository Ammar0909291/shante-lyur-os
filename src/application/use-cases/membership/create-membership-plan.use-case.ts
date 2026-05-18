import { MembershipPlan } from '@/domain/entities';
import { MembershipBillingPeriod, UserRole } from '@/domain/enums';
import { ForbiddenError } from '@/domain/errors';
import { IMembershipPlanRepository } from '@/application/ports';
import { CreateMembershipPlanDto } from '@/application/dto';

export class CreateMembershipPlanUseCase {
  constructor(private readonly planRepo: IMembershipPlanRepository) {}

  async execute(dto: CreateMembershipPlanDto, actorRole: UserRole): Promise<MembershipPlan> {
    if (actorRole === UserRole.CLIENT || actorRole === UserRole.SPECIALIST) {
      throw new ForbiddenError();
    }

    const plan = new MembershipPlan({
      id: crypto.randomUUID(),
      name: dto.name,
      description: dto.description,
      billingPeriod: dto.billingPeriod as MembershipBillingPeriod,
      billingPrice: dto.billingPrice,
      includedSessions: dto.includedSessions,
      discountPercent: dto.discountPercent,
      bonusPointsPerPeriod: dto.bonusPointsPerPeriod,
      applicableServiceIds: dto.applicableServiceIds,
      isActive: true,
      sortOrder: dto.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.planRepo.create(plan);
  }
}
