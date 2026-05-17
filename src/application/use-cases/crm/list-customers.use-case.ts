import { ICustomerProfileRepository } from '@/application/ports';
import { ListCustomersDto } from '@/application/dto';

export class ListCustomersUseCase {
  constructor(private readonly profileRepo: ICustomerProfileRepository) {}

  async execute(dto: ListCustomersDto) {
    return this.profileRepo.findMany({
      search: dto.search,
      loyaltyTier: dto.loyaltyTier,
      minVisits: dto.minVisits,
      maxChurnRisk: dto.maxChurnRisk,
      page: dto.page,
      limit: dto.limit,
    });
  }
}
