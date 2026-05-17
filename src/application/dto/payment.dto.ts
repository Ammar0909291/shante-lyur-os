import { z } from 'zod';
import { PaginationSchema, DateRangeSchema } from './pagination.dto';

export const CreatePaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  provider: z.enum(['YOOKASSA', 'ROBOKASSA', 'CASH', 'CARD_TERMINAL', 'TRANSFER', 'INTERNAL']),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default('RUB'),
  description: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export const ProcessWebhookSchema = z.object({
  provider: z.enum(['YOOKASSA', 'ROBOKASSA']),
  payload: z.record(z.unknown()),
  signature: z.string(),
});

export type ProcessWebhookDto = z.infer<typeof ProcessWebhookSchema>;

export const CreateRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(2000),
});

export type CreateRefundDto = z.infer<typeof CreateRefundSchema>;

export const ListPaymentsSchema = PaginationSchema.merge(DateRangeSchema).extend({
  status: z.enum(['PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'FAILED', 'CANCELLED', 'EXPIRED']).optional(),
  provider: z.enum(['YOOKASSA', 'ROBOKASSA', 'CASH', 'CARD_TERMINAL', 'TRANSFER', 'INTERNAL']).optional(),
});

export type ListPaymentsDto = z.infer<typeof ListPaymentsSchema>;

export const ApplyPromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
  appointmentId: z.string().uuid(),
  orderAmount: z.coerce.number().positive(),
});

export type ApplyPromoCodeDto = z.infer<typeof ApplyPromoCodeSchema>;

export const CreatePromoCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_]+$/, 'Only uppercase letters, numbers, and underscores'),
  description: z.string().max(500).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE']),
  discountValue: z.coerce.number().positive(),
  maxUses: z.coerce.number().int().positive().optional(),
  maxUsesPerUser: z.coerce.number().int().positive().default(1),
  minOrderAmount: z.coerce.number().positive().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  applicableServices: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => data.validFrom < data.validUntil,
  { message: 'validFrom must be before validUntil' }
).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE') return data.discountValue <= 100;
    return true;
  },
  { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
);

export type CreatePromoCodeDto = z.infer<typeof CreatePromoCodeSchema>;
