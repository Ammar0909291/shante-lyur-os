import { z } from 'zod';

export const CreatePayrollPeriodSchema = z.object({
  name: z.string().min(1).max(255),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
}).refine((d) => d.endDate >= d.startDate, {
  message: 'endDate must be on or after startDate',
  path: ['endDate'],
});

export const ApprovePayrollPeriodSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const RecordPayoutSchema = z.object({
  payoutId: z.string().uuid(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'OTHER']).optional(),
  notes: z.string().max(500).optional(),
});

export const AddPayrollAdjustmentSchema = z.object({
  periodId: z.string().uuid(),
  specialistId: z.string().uuid(),
  type: z.enum(['BONUS', 'DEDUCTION', 'CORRECTION']),
  amount: z.number().refine((v) => v !== 0, 'amount must be non-zero'),
  reason: z.string().min(1).max(500),
});

export const CreateCommissionRuleSchema = z.object({
  specialistId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  commissionType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  commissionValue: z.number().positive(),
  notes: z.string().max(500).optional(),
}).refine((d) => d.specialistId || d.serviceId, {
  message: 'At least one of specialistId or serviceId must be provided',
});

export const UpdateCommissionRuleSchema = z.object({
  commissionType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  commissionValue: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export type CreatePayrollPeriodDto = z.infer<typeof CreatePayrollPeriodSchema>;
export type ApprovePayrollPeriodDto = z.infer<typeof ApprovePayrollPeriodSchema>;
export type RecordPayoutDto = z.infer<typeof RecordPayoutSchema>;
export type AddPayrollAdjustmentDto = z.infer<typeof AddPayrollAdjustmentSchema>;
export type CreateCommissionRuleDto = z.infer<typeof CreateCommissionRuleSchema>;
export type UpdateCommissionRuleDto = z.infer<typeof UpdateCommissionRuleSchema>;
