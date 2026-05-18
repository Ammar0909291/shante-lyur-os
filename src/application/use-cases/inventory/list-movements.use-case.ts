import { IInventoryItemRepository, IInventoryMovementRepository } from '../../ports/inventory-repository.port';

export class ListMovementsUseCase {
  constructor(
    private readonly inventoryItemRepository: IInventoryItemRepository,
    private readonly inventoryMovementRepository: IInventoryMovementRepository,
  ) {}

  async execute(itemId: string, options?: { limit?: number; offset?: number }) {
    const item = await this.inventoryItemRepository.findById(itemId);
    if (!item) throw new Error('Inventory item not found');

    const { items, total } = await this.inventoryMovementRepository.findByItem(itemId, options);

    return { item, movements: items, total };
  }
}
