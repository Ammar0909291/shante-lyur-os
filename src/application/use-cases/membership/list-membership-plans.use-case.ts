import { MembershipPlan } from '@/domain/entities';
import { IMembershipPlanRepository } from '@/application/ports';

export class ListMembershipPlansUseCase {
  constructor(private readonly planRepo: IMembershipPlanRepository) {}

  async execute(onlyActive = true): Promise<MembershipPlan[]> {
    return this.planRepo.findAll(onlyActive);
  }
}
