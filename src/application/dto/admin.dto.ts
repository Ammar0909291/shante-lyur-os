import { z } from 'zod';


export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'SPECIALIST', 'CLIENT']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).default('ACTIVE'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserAdminSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
}).strict();

export type UpdateUserAdminDto = z.infer<typeof UpdateUserAdminSchema>;

export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  category: z.enum(['COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER']),
  basePrice: z.coerce.number().positive(),
  baseDuration: z.coerce.number().int().positive(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  requiresConsultation: z.boolean().default(false),
});

export type CreateServiceDto = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  category: z.enum(['COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER']).optional(),
  basePrice: z.coerce.number().positive().optional(),
  baseDuration: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  requiresConsultation: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict();

export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>;

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(1000),
  city: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  email: z.string().email().optional().or(z.literal('')),
  timezone: z.string().max(50).default('Europe/Moscow'),
});

export type CreateLocationDto = z.infer<typeof CreateLocationSchema>;

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().min(1).max(1000).optional(),
  city: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
}).strict();

export type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;

export const CreateSpecialistSchema = z.object({
  userId: z.string().uuid(),
  bio: z.string().max(2000).optional(),
  specialization: z.string().max(255).optional(),
  experienceYears: z.coerce.number().int().min(0).max(100).optional(),
  commissionRate: z.coerce.number().min(0).max(1).default(0.30),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional(),
});

export type CreateSpecialistDto = z.infer<typeof CreateSpecialistSchema>;

export const UpdateSpecialistSchema = z.object({
  bio: z.string().max(2000).optional().or(z.literal('')),
  specialization: z.string().max(255).optional().or(z.literal('')),
  experienceYears: z.coerce.number().int().min(0).max(100).optional(),
  commissionRate: z.coerce.number().min(0).max(1).optional(),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_VACATION', 'TERMINATED']).optional(),
}).strict();

export type UpdateSpecialistDto = z.infer<typeof UpdateSpecialistSchema>;

export const WorkingScheduleEntrySchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  breakStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal('')),
  breakEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal('')),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'startTime must be before endTime' }
).refine(
  (data) => {
    if (!data.breakStart || !data.breakEnd) return true;
    return data.breakStart > data.startTime && data.breakEnd < data.endTime && data.breakStart < data.breakEnd;
  },
  { message: 'Break must be within working hours' }
);

export type WorkingScheduleEntryDto = z.infer<typeof WorkingScheduleEntrySchema>;

export const CreateWorkingScheduleSchema = z.object({
  specialistId: z.string().uuid(),
  locationId: z.string().uuid(),
  schedules: z.array(WorkingScheduleEntrySchema).min(1),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
}).refine(
  (data) => !data.validUntil || data.validFrom <= data.validUntil,
  { message: 'validFrom must be before validUntil' }
);

export type CreateWorkingScheduleDto = z.infer<typeof CreateWorkingScheduleSchema>;

export const CreateBlockedTimeSchema = z.object({
  specialistId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  reason: z.string().max(255).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
}).refine(
  (data) => data.startAt < data.endAt,
  { message: 'startAt must be before endAt' }
);

export type CreateBlockedTimeDto = z.infer<typeof CreateBlockedTimeSchema>;

export const CreateVacationSchema = z.object({
  specialistId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().max(255).optional(),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be before or equal to endDate' }
);

export type CreateVacationDto = z.infer<typeof CreateVacationSchema>;

export const RevenueReportSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  groupBy: z.enum(['day', 'week', 'month', 'specialist', 'service', 'location']).default('day'),
}).refine(
  (data) => data.from <= data.to,
  { message: 'from must be before or equal to to' }
);

export type RevenueReportDto = z.infer<typeof RevenueReportSchema>;
