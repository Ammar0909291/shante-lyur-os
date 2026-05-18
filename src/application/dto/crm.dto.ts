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

export const MassagePreferencesSchema = z.object({
  profileId: z.string().uuid(),
  bodyType: z.enum(['athletic', 'normal', 'full']).optional(),
  pressurePreference: z.enum(['light', 'medium', 'firm', 'deep']),
  focusAreas: z.array(z.string().max(50)).min(1),
  avoidAreas: z.array(z.string().max(50)).optional(),
  oilPreferences: z.string().max(500).optional(),
  temperaturePreference: z.enum(['warm', 'hot', 'neutral']).optional(),
  additionalNotes: z.string().max(2000).optional(),
});

export type MassagePreferencesDto = z.infer<typeof MassagePreferencesSchema>;

export const SkincareProfileSchema = z.object({
  profileId: z.string().uuid(),
  skinType: z.enum(['oily', 'dry', 'combination', 'sensitive', 'normal']),
  skinConcerns: z.array(z.string().max(50)),
  lastPeelingDate: z.coerce.date().optional(),
  lastInjectionDate: z.coerce.date().optional(),
  lastLaserDate: z.coerce.date().optional(),
  homeRoutine: z.string().max(2000).optional(),
  reactionHistory: z.string().max(2000).optional(),
  currentMedications: z.string().max(1000).optional(),
  sunSensitivity: z.enum(['low', 'medium', 'high']).optional(),
});

export type SkincareProfileDto = z.infer<typeof SkincareProfileSchema>;

export const RecurringTreatmentSchema = z.object({
  profileId: z.string().uuid(),
  serviceId: z.string().uuid(),
  specialistId: z.string().uuid().optional(),
  frequencyDays: z.number().int().min(1).max(365),
  lastPerformedAt: z.coerce.date().optional(),
  nextRecommendedAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export type RecurringTreatmentDto = z.infer<typeof RecurringTreatmentSchema>;

export const CreateBeforeAfterPhotoSchema = z.object({
  profileId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  specialistId: z.string().uuid().optional(),
  caption: z.string().max(500).optional(),
  photoType: z.enum(['before', 'after']),
  consentGiven: z.boolean().refine((v) => v === true, { message: 'Client consent is required' }),
});

export type CreateBeforeAfterPhotoDto = z.infer<typeof CreateBeforeAfterPhotoSchema>;

export const CreateSkincareRecommendationSchema = z.object({
  profileId: z.string().uuid(),
  specialistId: z.string().uuid(),
  recommendationType: z.enum(['treatment', 'product', 'lifestyle', 'homecare']),
  text: z.string().min(1).max(3000),
  urgency: z.enum(['routine', 'recommended', 'urgent']).default('recommended'),
  validUntil: z.coerce.date().optional(),
});

export type CreateSkincareRecommendationDto = z.infer<typeof CreateSkincareRecommendationSchema>;

export const ListCustomersSchema = PaginationSchema.extend({
  search: z.string().optional(),
  loyaltyTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  minVisits: z.coerce.number().int().min(0).optional(),
  maxChurnRisk: z.coerce.number().min(0).max(1).optional(),
});

export type ListCustomersDto = z.infer<typeof ListCustomersSchema>;
