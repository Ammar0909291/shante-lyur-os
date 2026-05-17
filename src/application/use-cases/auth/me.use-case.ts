import { NotFoundError } from '@/domain/errors';
import { IUserRepository, ICustomerProfileRepository } from '@/application/ports';
import { User, CustomerProfile } from '@/domain/entities';

export interface MeResult {
  user: User;
  profile?: CustomerProfile;
}

export class GetMeUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(userId: string): Promise<MeResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const profile = await this.profileRepo.findByUserId(userId);

    return { user, profile: profile ?? undefined };
  }
}
