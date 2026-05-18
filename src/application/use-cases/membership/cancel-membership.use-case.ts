import { ClientMembership } from '@/domain/entities';
import { NotFoundError, ForbiddenError } from '@/domain/errors';
import { IClientMembershipRepository, ICustomerProfileRepository } from '@/application/ports';
import { CancelMembershipDto } from '@/application/dto';
import { UserRole } from '@/domain/enums';

export class CancelMembershipUseCase {
  constructor(
    private readonly membershipRepo: IClientMembershipRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(
    membershipId: string,
    dto: CancelMembershipDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<ClientMembership> {
    const membership = await this.membershipRepo.findById(membershipId);
    if (!membership) {
      throw new NotFoundError('ClientMembership', membershipId);
    }

    if (actorRole === UserRole.CLIENT) {
      const stats = await this.profileRepo.getLoyaltyStats(membership.profileId);
      if (!stats) throw new NotFoundError('CustomerProfile', membership.profileId);
    }

    membership.cancel(dto.reason);
    return this.membershipRepo.update(membership);
  }
}
