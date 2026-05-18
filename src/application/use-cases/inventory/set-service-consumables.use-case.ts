import {
  IInventoryItemRepository,
  IServiceConsumableRepository,
} from '../../ports/inventory-repository.port';
import { SetServiceConsumablesDto } from '../../dto/inventory.dto';

export class SetServiceConsumablesUseCase {
  constructor(
    private readonly inventoryItemRepository: IInventoryItemRepository,
    private readonly serviceConsumableRepository: IServiceConsumableRepository,
  ) {}

  async execute(dto: SetServiceConsumablesDto) {
    for (const c of dto.consumables) {
      const item = await this.inventoryItemRepository.findById(c.itemId);
      if (!item) throw new Error(`Inventory item ${c.itemId} not found`);
    }

    const consumables = await this.serviceConsumableRepository.setForService(
      dto.serviceId,
      dto.consumables,
    );

    return consumables;
  }
}
