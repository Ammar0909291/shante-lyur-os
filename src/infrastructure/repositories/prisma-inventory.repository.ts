import { PrismaClient } from '@prisma/client';
import {
  ISupplierRepository,
  IInventoryItemRepository,
  IInventoryMovementRepository,
  IServiceConsumableRepository,
  IAppointmentConsumableRepository,
  SupplierData,
  CreateSupplierData,
  CreateInventoryItemData,
  ApplyMovementOptions,
  AppointmentConsumableData,
  CreateAppointmentConsumableData,
  SetConsumableData,
} from '@/application/ports/inventory-repository.port';
import { InventoryItem, InventoryMovement, ServiceConsumable } from '@/domain/entities';
import { InventoryCategory, InventoryMovementType } from '@/domain/enums';

function toItemDomain(raw: {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  costPrice: unknown;
  retailPrice: unknown | null;
  currentStock: unknown;
  minStockLevel: unknown;
  maxStockLevel: unknown | null;
  supplierId: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InventoryItem {
  return new InventoryItem({
    id: raw.id,
    name: raw.name,
    sku: raw.sku ?? undefined,
    category: raw.category as InventoryCategory,
    unit: raw.unit,
    costPrice: Number(raw.costPrice),
    retailPrice: raw.retailPrice != null ? Number(raw.retailPrice) : undefined,
    currentStock: Number(raw.currentStock),
    minStockLevel: Number(raw.minStockLevel),
    maxStockLevel: raw.maxStockLevel != null ? Number(raw.maxStockLevel) : undefined,
    supplierId: raw.supplierId ?? undefined,
    isActive: raw.isActive,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

function toMovementDomain(raw: {
  id: string;
  itemId: string;
  type: string;
  quantity: unknown;
  stockBefore: unknown;
  stockAfter: unknown;
  unitCost: unknown | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: Date;
}): InventoryMovement {
  return new InventoryMovement({
    id: raw.id,
    itemId: raw.itemId,
    type: raw.type as InventoryMovementType,
    quantity: Number(raw.quantity),
    stockBefore: Number(raw.stockBefore),
    stockAfter: Number(raw.stockAfter),
    unitCost: raw.unitCost != null ? Number(raw.unitCost) : undefined,
    referenceType: raw.referenceType ?? undefined,
    referenceId: raw.referenceId ?? undefined,
    notes: raw.notes ?? undefined,
    performedBy: raw.performedBy ?? undefined,
    createdAt: raw.createdAt,
  });
}

function toServiceConsumableDomain(raw: {
  id: string;
  serviceId: string;
  itemId: string;
  quantityPerUse: unknown;
  isOptional: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ServiceConsumable {
  return new ServiceConsumable({
    id: raw.id,
    serviceId: raw.serviceId,
    itemId: raw.itemId,
    quantityPerUse: Number(raw.quantityPerUse),
    isOptional: raw.isOptional,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAll(options?: { isActive?: boolean }): Promise<SupplierData[]> {
    const rows = await (this.db as any).supplier.findMany({
      where: options?.isActive !== undefined ? { isActive: options.isActive } : undefined,
      orderBy: { name: 'asc' },
    });
    return rows as SupplierData[];
  }

  async findById(id: string): Promise<SupplierData | null> {
    const row = await (this.db as any).supplier.findUnique({ where: { id } });
    return row as SupplierData | null;
  }

  async create(data: CreateSupplierData): Promise<SupplierData> {
    const row = await (this.db as any).supplier.create({ data });
    return row as SupplierData;
  }

  async update(id: string, data: Partial<CreateSupplierData> & { isActive?: boolean }): Promise<SupplierData> {
    const row = await (this.db as any).supplier.update({ where: { id }, data });
    return row as SupplierData;
  }
}

export class PrismaInventoryItemRepository implements IInventoryItemRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAll(options?: {
    category?: InventoryCategory;
    isActive?: boolean;
    lowStockOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: InventoryItem[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options?.isActive !== undefined) where['isActive'] = options.isActive;
    if (options?.category) where['category'] = options.category;
    if (options?.lowStockOnly) {
      where['currentStock'] = { lte: (this.db as any).inventoryItem.fields.minStockLevel };
    }

    const [rows, total] = await Promise.all([
      (this.db as any).inventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        take: options?.limit,
        skip: options?.offset,
      }),
      (this.db as any).inventoryItem.count({ where }),
    ]);

    // Filter low stock in application if needed (Prisma can't compare two columns in a simple where)
    let items: InventoryItem[] = rows.map(toItemDomain);
    if (options?.lowStockOnly) {
      items = items.filter((i) => i.isLowStock);
    }

    return { items, total: options?.lowStockOnly ? items.length : total };
  }

  async findById(id: string): Promise<InventoryItem | null> {
    const row = await (this.db as any).inventoryItem.findUnique({ where: { id } });
    return row ? toItemDomain(row) : null;
  }

  async create(data: CreateInventoryItemData): Promise<InventoryItem> {
    const row = await (this.db as any).inventoryItem.create({ data });
    return toItemDomain(row);
  }

  async update(
    id: string,
    data: Partial<CreateInventoryItemData> & { isActive?: boolean },
  ): Promise<InventoryItem> {
    const row = await (this.db as any).inventoryItem.update({ where: { id }, data });
    return toItemDomain(row);
  }

  async applyMovement(
    itemId: string,
    quantity: number,
    options: ApplyMovementOptions,
  ): Promise<{ item: InventoryItem; movement: InventoryMovement }> {
    const [updatedRow, movementRow] = await this.db.$transaction(async (tx) => {
      const current = await (tx as any).inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const stockBefore = Number(current.currentStock);
      const stockAfter = stockBefore + quantity;

      if (stockAfter < 0) {
        throw new Error(
          `Insufficient stock: have ${stockBefore} ${current.unit}, need ${Math.abs(quantity)}`,
        );
      }

      const updated = await (tx as any).inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: stockAfter },
      });

      const movement = await (tx as any).inventoryMovement.create({
        data: {
          itemId,
          type: options.type,
          quantity,
          stockBefore,
          stockAfter,
          unitCost: options.unitCost,
          referenceType: options.referenceType,
          referenceId: options.referenceId,
          notes: options.notes,
          performedBy: options.performedBy,
        },
      });

      return [updated, movement];
    });

    return { item: toItemDomain(updatedRow), movement: toMovementDomain(movementRow) };
  }
}

export class PrismaInventoryMovementRepository implements IInventoryMovementRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByItem(
    itemId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: InventoryMovement[]; total: number }> {
    const [rows, total] = await Promise.all([
      (this.db as any).inventoryMovement.findMany({
        where: { itemId },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      (this.db as any).inventoryMovement.count({ where: { itemId } }),
    ]);

    return { items: rows.map(toMovementDomain), total };
  }

  async findByReference(referenceType: string, referenceId: string): Promise<InventoryMovement[]> {
    const rows = await (this.db as any).inventoryMovement.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMovementDomain);
  }
}

export class PrismaServiceConsumableRepository implements IServiceConsumableRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByService(serviceId: string): Promise<ServiceConsumable[]> {
    const rows = await (this.db as any).serviceConsumable.findMany({
      where: { serviceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toServiceConsumableDomain);
  }

  async setForService(serviceId: string, consumables: SetConsumableData[]): Promise<ServiceConsumable[]> {
    await (this.db as any).serviceConsumable.deleteMany({ where: { serviceId } });

    if (consumables.length === 0) return [];

    await (this.db as any).serviceConsumable.createMany({
      data: consumables.map((c) => ({
        serviceId,
        itemId: c.itemId,
        quantityPerUse: c.quantityPerUse,
        isOptional: c.isOptional ?? false,
        notes: c.notes,
      })),
    });

    return this.findByService(serviceId);
  }
}

export class PrismaAppointmentConsumableRepository implements IAppointmentConsumableRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByAppointment(appointmentId: string): Promise<AppointmentConsumableData[]> {
    const rows = await (this.db as any).appointmentConsumable.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      appointmentId: r.appointmentId,
      itemId: r.itemId,
      serviceId: r.serviceId ?? undefined,
      quantityUsed: Number(r.quantityUsed),
      unitCost: r.unitCost != null ? Number(r.unitCost) : undefined,
      notes: r.notes ?? undefined,
      recordedBy: r.recordedBy ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  async bulkCreate(data: CreateAppointmentConsumableData[]): Promise<AppointmentConsumableData[]> {
    await (this.db as any).appointmentConsumable.createMany({ data });
    // Return by fetching (createMany doesn't return records)
    const rows = await (this.db as any).appointmentConsumable.findMany({
      where: { appointmentId: data[0]?.appointmentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      appointmentId: r.appointmentId,
      itemId: r.itemId,
      serviceId: r.serviceId ?? undefined,
      quantityUsed: Number(r.quantityUsed),
      unitCost: r.unitCost != null ? Number(r.unitCost) : undefined,
      notes: r.notes ?? undefined,
      recordedBy: r.recordedBy ?? undefined,
      createdAt: r.createdAt,
    }));
  }
}
