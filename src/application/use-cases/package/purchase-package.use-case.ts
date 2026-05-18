import { ClientPackage } from '@/domain/entities';
import { ClientPackageStatus } from '@/domain/enums';
import { NotFoundError } from '@/domain/errors';
import { IClientPackageRepository, ICustomerProfileRepository } from '@/application/ports';
import { PurchasePackageDto } from '@/application/dto';

export class PurchasePackageUseCase {
  constructor(
    private readonly packageRepo: IClientPackageRepository,
    private readonly profileRepo: ICustomerProfileRepository,
  ) {}

  async execute(dto: PurchasePackageDto): Promise<ClientPackage> {
    const stats = await this.profileRepo.getLoyaltyStats(dto.profileId);
    if (!stats) {
      throw new NotFoundError('CustomerProfile', dto.profileId);
    }

    const now = new Date();
    const pkg = new ClientPackage({
      id: crypto.randomUUID(),
      profileId: dto.profileId,
      name: dto.name,
      serviceId: dto.serviceId,
      totalSessions: dto.totalSessions,
      usedSessions: 0,
      priceTotal: dto.priceTotal,
      purchasedAt: now,
      expiresAt: dto.expiresAt,
      status: ClientPackageStatus.ACTIVE,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
    });

    return this.packageRepo.create(pkg);
  }
}
