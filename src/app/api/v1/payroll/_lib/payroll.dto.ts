import { z } from 'zod';

export const SalaryConfigSchema = z.object({
  salaryType: z.enum(['FIXED', 'HOURLY', 'SHIFT', 'HYBRID']),
  fixedAmount: z.number().min(0).default(0),
  hourlyRate: z.number().min(0).default(0),
  shiftRate: z.number().min(0).default(0),
  commissionRate: z.number().min(0).max(100).default(0), // stored as 0-100, divide by 100 when saving
  bonusThresholdSessions: z.number().int().min(1).nullable().optional(),
  notes: z.string().max(500).optional(),
});
export type SalaryConfigDto = z.infer<typeof SalaryConfigSchema>;

export const CalculatePayrollSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CalculatePayrollDto = z.infer<typeof CalculatePayrollSchema>;

export const AddPayrollEntrySchema = z.object({
  type: z.enum(['BONUS', 'DEDUCTION', 'ADJUSTMENT']),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
});
export type AddPayrollEntryDto = z.infer<typeof AddPayrollEntrySchema>;

export const UpdatePayrollStatusSchema = z.object({
  status: z.enum(['APPROVED', 'PAID']),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type UpdatePayrollStatusDto = z.infer<typeof UpdatePayrollStatusSchema>;
