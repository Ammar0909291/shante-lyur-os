import { InventoryItem, InventoryMovement, ServiceConsumable } from '../../domain/entities';
import { InventoryCategory, InventoryMovementType } from '../../domain/enums';

export interface SupplierData {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierData {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  notes?: string;
}

export interface CreateInventoryItemData {
  name: string;
  sku?: string;
  category: InventoryCategory;
  unit: string;
  costPrice: number;
  retailPrice?: number;
  currentStock?: number;
  minStockLevel: number;
  maxStockLevel?: number;
  supplierId?: string;
  notes?: string;
}

export interface ApplyMovementOptions {
  type: InventoryMovementType;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  performedBy?: string;
}

export interface AppointmentConsumableData {
  id: string;
  appointmentId: string;
  itemId: string;
  serviceId?: string;
  quantityUsed: number;
  unitCost?: number;
  notes?: string;
  recordedBy?: string;
  createdAt: Date;
}

export interface CreateAppointmentConsumableData {
  appointmentId: string;
  itemId: string;
  serviceId?: string;
  quantityUsed: number;
  unitCost?: number;
  notes?: string;
  recordedBy?: string;
}

export interface SetConsumableData {
  itemId: string;
  quantityPerUse: number;
  isOptional?: boolean;
  notes?: string;
}

export interface ISupplierRepository {
  findAll(options?: { isActive?: boolean }): Promise<SupplierData[]>;
  findById(id: string): Promise<SupplierData | null>;
  create(data: CreateSupplierData): Promise<SupplierData>;
  update(id: string, data: Partial<CreateSupplierData> & { isActive?: boolean }): Promise<SupplierData>;
}

export interface IInventoryItemRepository {
  findAll(options?: {
    category?: InventoryCategory;
    isActive?: boolean;
    lowStockOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: InventoryItem[]; total: number }>;
  findById(id: string): Promise<InventoryItem | null>;
  create(data: CreateInventoryItemData): Promise<InventoryItem>;
  update(id: string, data: Partial<CreateInventoryItemData> & { isActive?: boolean }): Promise<InventoryItem>;
  applyMovement(
    itemId: string,
    quantity: number,
    options: ApplyMovementOptions,
  ): Promise<{ item: InventoryItem; movement: InventoryMovement }>;
}

export interface IInventoryMovementRepository {
  findByItem(
    itemId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: InventoryMovement[]; total: number }>;
  findByReference(referenceType: string, referenceId: string): Promise<InventoryMovement[]>;
}

export interface IServiceConsumableRepository {
  findByService(serviceId: string): Promise<ServiceConsumable[]>;
  setForService(serviceId: string, consumables: SetConsumableData[]): Promise<ServiceConsumable[]>;
}

export interface IAppointmentConsumableRepository {
  findByAppointment(appointmentId: string): Promise<AppointmentConsumableData[]>;
  bulkCreate(data: CreateAppointmentConsumableData[]): Promise<AppointmentConsumableData[]>;
}
