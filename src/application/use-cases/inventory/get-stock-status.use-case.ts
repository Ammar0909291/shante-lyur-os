import { IInventoryItemRepository } from '../../ports/inventory-repository.port';
import { InventoryCategory } from '../../../domain/enums';

export class GetStockStatusUseCase {
  constructor(private readonly inventoryItemRepository: IInventoryItemRepository) {}

  async execute(options?: { category?: InventoryCategory; lowStockOnly?: boolean }) {
    const { items, total } = await this.inventoryItemRepository.findAll({
      isActive: true,
      category: options?.category,
      lowStockOnly: options?.lowStockOnly,
    });

    const lowStockItems = items.filter((i) => i.isLowStock);
    const outOfStockItems = items.filter((i) => i.isOutOfStock);

    const totalInventoryValue = items.reduce(
      (sum, i) => sum + i.currentStock * i.costPrice,
      0,
    );

    const totalRetailValue = items.reduce(
      (sum, i) => sum + i.currentStock * (i.retailPrice ?? i.costPrice),
      0,
    );

    return {
      items,
      total,
      summary: {
        totalItems: total,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalInventoryValue,
        totalRetailValue,
        lowStockItems: lowStockItems.map((i) => ({
          id: i.id,
          name: i.name,
          currentStock: i.currentStock,
          minStockLevel: i.minStockLevel,
          unit: i.unit,
        })),
      },
    };
  }
}
