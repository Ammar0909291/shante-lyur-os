import { ClientPackage } from '@/domain/entities';
import { IClientPackageRepository } from '@/application/ports';

export class ListClientPackagesUseCase {
  constructor(private readonly packageRepo: IClientPackageRepository) {}

  async execute(profileId: string, activeOnly = false): Promise<ClientPackage[]> {
    if (activeOnly) {
      return this.packageRepo.findActiveByProfileId(profileId);
    }
    return this.packageRepo.findByProfileId(profileId);
  }
}
