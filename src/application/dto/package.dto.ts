import { z } from 'zod';

export const PurchasePackageSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).max(255),
  serviceId: z.string().uuid().optional(),
  totalSessions: z.number().int().min(1).max(100),
  priceTotal: z.number().positive(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export type PurchasePackageDto = z.infer<typeof PurchasePackageSchema>;

export const UsePackageSessionSchema = z.object({
  packageId: z.string().uuid(),
  appointmentId: z.string().uuid(),
});

export type UsePackageSessionDto = z.infer<typeof UsePackageSessionSchema>;
