import {
  IInventoryItemRepository,
  IAppointmentConsumableRepository,
} from '../../ports/inventory-repository.port';
import { RecordAppointmentUsageDto } from '../../dto/inventory.dto';
import { InventoryMovementType } from '../../../domain/enums';

export class RecordAppointmentUsageUseCase {
  constructor(
    private readonly inventoryItemRepository: IInventoryItemRepository,
    private readonly appointmentConsumableRepository: IAppointmentConsumableRepository,
  ) {}

  async execute(dto: RecordAppointmentUsageDto) {
    const movements = [];
    const consumableRecords = [];

    for (const usage of dto.usages) {
      const item = await this.inventoryItemRepository.findById(usage.itemId);
      if (!item) throw new Error(`Inventory item ${usage.itemId} not found`);

      const { movement } = await this.inventoryItemRepository.applyMovement(
        usage.itemId,
        -usage.quantityUsed,
        {
          type: InventoryMovementType.PROCEDURE_USE,
          unitCost: item.costPrice,
          referenceType: 'appointment',
          referenceId: dto.appointmentId,
          notes: usage.notes,
          performedBy: dto.recordedBy,
        },
      );
      movements.push(movement);

      consumableRecords.push({
        appointmentId: dto.appointmentId,
        itemId: usage.itemId,
        serviceId: usage.serviceId,
        quantityUsed: usage.quantityUsed,
        unitCost: item.costPrice,
        notes: usage.notes,
        recordedBy: dto.recordedBy,
      });
    }

    const saved = await this.appointmentConsumableRepository.bulkCreate(consumableRecords);

    return { movements, consumables: saved };
  }
}
