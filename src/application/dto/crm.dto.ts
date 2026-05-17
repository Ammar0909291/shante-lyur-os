import { z } from 'zod';
import { PaginationSchema } from './pagination.dto';

export const CreateCustomerProfileSchema = z.object({
  userId: z.string().uuid(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  skinType: z.string().max(50).optional(),
  hairType: z.string().max(50).optional(),
  bodyType: z.string().max(50).optional(),
  preferredLocationId: z.string().uuid().optional(),
  preferredSpecialistId: z.string().uuid().optional(),
  referralSource: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateCustomerProfileDto = z.infer<typeof CreateCustomerProfileSchema>;

export const UpdateCustomerProfileSchema = z.object({
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  skinType: z.string().max(50).optional(),
  hairType: z.string().max(50).optional(),
  bodyType: z.string().max(50).optional(),
  preferredLocationId: z.string().uuid().optional(),
  preferredSpecialistId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
}).strict();

export type UpdateCustomerProfileDto = z.infer<typeof UpdateCustomerProfileSchema>;

export const CreateAllergySchema = z.object({
  profileId: z.string().uuid(),
  allergen: z.string().min(1).max(255),
  severity: z.enum(['mild', 'moderate', 'severe']),
  reaction: z.string().max(2000).optional(),
  diagnosedAt: z.coerce.date().optional(),
});

export type CreateAllergyDto = z.infer<typeof CreateAllergySchema>;

export const CreateRestrictionSchema = z.object({
  profileId: z.string().uuid(),
  type: z.enum(['medical', 'pregnancy', 'medication', 'other']),
  description: z.string().min(1).max(2000),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
}).refine(
  (data) => !data.validFrom || !data.validUntil || data.validFrom <= data.validUntil,
  { message: 'validFrom must be before validUntil' }
);

export type CreateRestrictionDto = z.infer<typeof CreateRestrictionSchema>;

export const CreateSpecialistNoteSchema = z.object({
  specialistId: z.string().uuid(),
  profileId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  noteType: z.enum(['consultation', 'procedure', 'followup', 'general', 'complaint']),
  content: z.string().min(1).max(10000),
  privacy: z.enum(['PRIVATE', 'SHARED', 'ADMIN_ONLY', 'CLIENT_VISIBLE']).default('PRIVATE'),
});

export type CreateSpecialistNoteDto = z.infer<typeof CreateSpecialistNoteSchema>;

export const CreateProcedureHistorySchema = z.object({
  profileId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  serviceId: z.string().uuid(),
  specialistId: z.string().uuid(),
  performedAt: z.coerce.date(),
  results: z.string().max(5000).optional(),
  sideEffects: z.string().max(2000).optional(),
  clientFeedback: z.string().max(2000).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.coerce.date().optional(),
});

export type CreateProcedureHistoryDto = z.infer<typeof CreateProcedureHistorySchema>;

export const CreateCustomerTagSchema = z.object({
  profileId: z.string().uuid(),
  tag: z.string().min(1).max(50),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional(),
});

export type CreateCustomerTagDto = z.infer<typeof CreateCustomerTagSchema>;

export const CreateReferralSchema = z.object({
  referrerId: z.string().uuid(),
  referredId: z.string().uuid(),
  code: z.string().min(3).max(50),
  rewardType: z.enum(['discount', 'points', 'service']).optional(),
  rewardValue: z.coerce.number().positive().optional(),
});

export type CreateReferralDto = z.infer<typeof CreateReferralSchema>;

export const ListCustomersSchema = PaginationSchema.extend({
  search: z.string().optional(),
  loyaltyTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  minVisits: z.coerce.number().int().min(0).optional(),
  maxChurnRisk: z.coerce.number().min(0).max(1).optional(),
});

export type ListCustomersDto = z.infer<typeof ListCustomersSchema>;
