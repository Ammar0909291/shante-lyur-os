import { ClientPackage } from '@/domain/entities';
import { NotFoundError } from '@/domain/errors';
import { IClientPackageRepository } from '@/application/ports';
import { UsePackageSessionDto } from '@/application/dto';

export class UsePackageSessionUseCase {
  constructor(private readonly packageRepo: IClientPackageRepository) {}

  async execute(dto: UsePackageSessionDto): Promise<ClientPackage> {
    const pkg = await this.packageRepo.findById(dto.packageId);
    if (!pkg) {
      throw new NotFoundError('ClientPackage', dto.packageId);
    }

    pkg.useSession();
    return this.packageRepo.update(pkg);
  }
}
