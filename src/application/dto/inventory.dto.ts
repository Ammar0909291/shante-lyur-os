import { z } from 'zod';

export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().max(100).optional(),
  category: z.enum(['CONSUMABLE', 'RETAIL', 'EQUIPMENT']),
  unit: z.string().min(1).max(30),
  costPrice: z.number().positive(),
  retailPrice: z.number().positive().optional(),
  currentStock: z.number().min(0).default(0),
  minStockLevel: z.number().min(0),
  maxStockLevel: z.number().positive().optional(),
  supplierId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateInventoryItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().max(100).optional(),
  costPrice: z.number().positive().optional(),
  retailPrice: z.number().positive().optional(),
  minStockLevel: z.number().min(0).optional(),
  maxStockLevel: z.number().positive().optional(),
  supplierId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const AdjustStockSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().refine((v) => v !== 0, 'quantity must be non-zero'),
  type: z.enum(['PURCHASE', 'ADJUSTMENT', 'RETURN', 'WASTE', 'TRANSFER']),
  unitCost: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  performedBy: z.string().uuid().optional(),
});

export const RecordAppointmentUsageSchema = z.object({
  appointmentId: z.string().uuid(),
  usages: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        serviceId: z.string().uuid().optional(),
        quantityUsed: z.number().positive(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1),
  recordedBy: z.string().uuid().optional(),
});

export const RecordRetailSaleSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  appointmentId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  performedBy: z.string().uuid().optional(),
});

export const SetServiceConsumablesSchema = z.object({
  serviceId: z.string().uuid(),
  consumables: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantityPerUse: z.number().positive(),
      isOptional: z.boolean().default(false),
      notes: z.string().max(500).optional(),
    }),
  ),
});

export const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  contactName: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateInventoryItemDto = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemDto = z.infer<typeof UpdateInventoryItemSchema>;
export type AdjustStockDto = z.infer<typeof AdjustStockSchema>;
export type RecordAppointmentUsageDto = z.infer<typeof RecordAppointmentUsageSchema>;
export type RecordRetailSaleDto = z.infer<typeof RecordRetailSaleSchema>;
export type SetServiceConsumablesDto = z.infer<typeof SetServiceConsumablesSchema>;
export type CreateSupplierDto = z.infer<typeof CreateSupplierSchema>;
