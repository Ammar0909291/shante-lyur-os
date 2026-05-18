import { IInventoryItemRepository } from '../../ports/inventory-repository.port';
import { RecordRetailSaleDto } from '../../dto/inventory.dto';
import { InventoryMovementType, InventoryCategory } from '../../../domain/enums';

export class RecordRetailSaleUseCase {
  constructor(private readonly inventoryItemRepository: IInventoryItemRepository) {}

  async execute(dto: RecordRetailSaleDto) {
    const item = await this.inventoryItemRepository.findById(dto.itemId);
    if (!item) throw new Error('Inventory item not found');
    if (!item.isActive) throw new Error('Inventory item is inactive');
    if (item.category !== InventoryCategory.RETAIL) {
      throw new Error('Item is not a retail product');
    }

    const { item: updated, movement } = await this.inventoryItemRepository.applyMovement(
      dto.itemId,
      -dto.quantity,
      {
        type: InventoryMovementType.RETAIL_SALE,
        unitCost: item.retailPrice ?? item.costPrice,
        referenceType: dto.appointmentId ? 'appointment' : undefined,
        referenceId: dto.appointmentId,
        notes: dto.notes,
        performedBy: dto.performedBy,
      },
    );

    const saleAmount = (item.retailPrice ?? item.costPrice) * dto.quantity;

    return { item: updated, movement, saleAmount, isLowStock: updated.isLowStock };
  }
}
