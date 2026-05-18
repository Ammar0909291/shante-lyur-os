import { z } from 'zod';

export const CreateMembershipPlanSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  billingPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  billingPrice: z.number().positive(),
  includedSessions: z.number().int().positive().optional(),
  discountPercent: z.number().int().min(0).max(50).default(0),
  bonusPointsPerPeriod: z.number().int().min(0).default(0),
  applicableServiceIds: z.array(z.string().uuid()).default([]),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateMembershipPlanDto = z.infer<typeof CreateMembershipPlanSchema>;

export const PurchaseMembershipSchema = z.object({
  profileId: z.string().uuid(),
  planId: z.string().uuid(),
  autoRenew: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

export type PurchaseMembershipDto = z.infer<typeof PurchaseMembershipSchema>;

export const CancelMembershipSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CancelMembershipDto = z.infer<typeof CancelMembershipSchema>;
