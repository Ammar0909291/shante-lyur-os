import { z } from 'zod';
import { PaginationSchema } from './pagination.dto';

export const RedeemLoyaltySchema = z.object({
  profileId: z.string().uuid(),
  pointsToRedeem: z.number().int().positive().max(100_000),
  appointmentId: z.string().uuid().optional(),
  description: z.string().max(255).optional(),
});

export type RedeemLoyaltyDto = z.infer<typeof RedeemLoyaltySchema>;

export const ManualAdjustLoyaltySchema = z.object({
  profileId: z.string().uuid(),
  points: z.number().int().min(-100_000).max(100_000),
  description: z.string().min(1).max(255),
});

export type ManualAdjustLoyaltyDto = z.infer<typeof ManualAdjustLoyaltySchema>;

export const LoyaltyTransactionListSchema = PaginationSchema.extend({
  profileId: z.string().uuid(),
});

export type LoyaltyTransactionListDto = z.infer<typeof LoyaltyTransactionListSchema>;

export const ClaimReferralRewardSchema = z.object({
  referralId: z.string().uuid(),
  profileId: z.string().uuid(),
});

export type ClaimReferralRewardDto = z.infer<typeof ClaimReferralRewardSchema>;
