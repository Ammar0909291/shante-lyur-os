import { z } from 'zod';
import { PaginationSchema, DateRangeSchema } from './pagination.dto';

export const AppointmentServiceItemSchema = z.object({
  serviceId: z.string().uuid(),
  price: z.coerce.number().positive(),
  duration: z.coerce.number().int().positive(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const CreateAppointmentSchema = z.object({
  specialistId: z.string().uuid(),
  locationId: z.string().uuid(),
  startAt: z.coerce.date(),
  services: z.array(AppointmentServiceItemSchema).min(1, 'At least one service required'),
  notes: z.string().max(2000).optional(),
  promoCode: z.string().optional(),
  source: z.enum(['web', 'phone', 'walkin', 'admin']).default('web'),
}).refine(
  (data) => {
    const now = new Date();
    const minLead = new Date(now.getTime() + 30 * 60000); // 30 min minimum
    return data.startAt >= minLead;
  },
  { message: 'Appointment must be booked at least 30 minutes in advance', path: ['startAt'] }
);

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),
  notes: z.string().max(2000).optional(),
  services: z.array(AppointmentServiceItemSchema).optional(),
}).strict();

export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;

export const RescheduleAppointmentSchema = z.object({
  newStartAt: z.coerce.date(),
  reason: z.string().max(500).optional(),
}).refine(
  (data) => {
    const now = new Date();
    const minLead = new Date(now.getTime() + 30 * 60000);
    return data.newStartAt >= minLead;
  },
  { message: 'Rescheduled appointment must be at least 30 minutes in advance', path: ['newStartAt'] }
);

export type RescheduleAppointmentDto = z.infer<typeof RescheduleAppointmentSchema>;

export const CancelAppointmentSchema = z.object({
  reason: z.enum(['CLIENT_REQUEST', 'SPECIALIST_UNAVAILABLE', 'WEATHER', 'EMERGENCY', 'NO_SHOW', 'OTHER']),
  notes: z.string().max(500).optional(),
});

export type CancelAppointmentDto = z.infer<typeof CancelAppointmentSchema>;

export const ListAppointmentsSchema = PaginationSchema.merge(DateRangeSchema).extend({
  specialistId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),
});

export type ListAppointmentsDto = z.infer<typeof ListAppointmentsSchema>;

export const CheckAvailabilitySchema = z.object({
  specialistId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.coerce.date(),
  duration: z.coerce.number().int().positive().default(60),
});

export type CheckAvailabilityDto = z.infer<typeof CheckAvailabilitySchema>;
