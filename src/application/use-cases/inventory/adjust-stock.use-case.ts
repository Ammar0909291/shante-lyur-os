import { IInventoryItemRepository } from '../../ports/inventory-repository.port';
import { AdjustStockDto } from '../../dto/inventory.dto';
import { InventoryMovementType } from '../../../domain/enums';

export class AdjustStockUseCase {
  constructor(private readonly inventoryItemRepository: IInventoryItemRepository) {}

  async execute(dto: AdjustStockDto) {
    const item = await this.inventoryItemRepository.findById(dto.itemId);
    if (!item) throw new Error('Inventory item not found');
    if (!item.isActive) throw new Error('Inventory item is inactive');

    const { item: updated, movement } = await this.inventoryItemRepository.applyMovement(
      dto.itemId,
      dto.quantity,
      {
        type: dto.type as InventoryMovementType,
        unitCost: dto.unitCost,
        notes: dto.notes,
        performedBy: dto.performedBy,
      },
    );

    return { item: updated, movement, isLowStock: updated.isLowStock };
  }
}
