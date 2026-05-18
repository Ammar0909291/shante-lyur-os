import { IInventoryItemRepository, ISupplierRepository } from '../../ports/inventory-repository.port';
import { CreateInventoryItemDto } from '../../dto/inventory.dto';
import { InventoryCategory } from '../../../domain/enums';

export class CreateInventoryItemUseCase {
  constructor(
    private readonly inventoryItemRepository: IInventoryItemRepository,
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(dto: CreateInventoryItemDto) {
    if (dto.supplierId) {
      const supplier = await this.supplierRepository.findById(dto.supplierId);
      if (!supplier) throw new Error('Supplier not found');
      if (!supplier.isActive) throw new Error('Supplier is inactive');
    }

    const item = await this.inventoryItemRepository.create({
      name: dto.name,
      sku: dto.sku,
      category: dto.category as InventoryCategory,
      unit: dto.unit,
      costPrice: dto.costPrice,
      retailPrice: dto.retailPrice,
      currentStock: dto.currentStock ?? 0,
      minStockLevel: dto.minStockLevel,
      maxStockLevel: dto.maxStockLevel,
      supplierId: dto.supplierId,
      notes: dto.notes,
    });

    return item;
  }
}
