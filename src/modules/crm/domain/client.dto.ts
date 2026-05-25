/**
 * Universal Customer Profile — DTOs and Zod schemas
 *
 * Input schemas use Zod for runtime validation.
 * Output types use strict TypeScript interfaces.
 */

import { z } from 'zod';

// ─── Re-usable building blocks ────────────────────────────────────────────────

export const ClientIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ─── Query schemas (all API inputs) ──────────────────────────────────────────

export const GetClientBookingsSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  status:       z.string().optional(),
  from:         z.coerce.date().optional(),
  to:           z.coerce.date().optional(),
  specialistId: z.string().uuid().optional(),
}).refine(
  (d) => !d.from || !d.to || d.from <= d.to,
  { message: 'from must be before or equal to to' },
);
export type GetClientBookingsQuery = z.infer<typeof GetClientBookingsSchema>;

export const GetClientTreatmentsSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetClientTreatmentsQuery = z.infer<typeof GetClientTreatmentsSchema>;

export const GetClientTransactionsSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  from:  z.coerce.date().optional(),
  to:    z.coerce.date().optional(),
});
export type GetClientTransactionsQuery = z.infer<typeof GetClientTransactionsSchema>;

// ─── Input mutation schemas ───────────────────────────────────────────────────

export const CreateClientNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});
export type CreateClientNoteDto = z.infer<typeof CreateClientNoteSchema>;

export const CreateTreatmentRecordSchema = z.object({
  serviceId:       z.string().uuid(),
  specialistId:    z.string().uuid(),
  appointmentId:   z.string().uuid().optional(),
  performedAt:     z.coerce.date(),
  results:         z.string().max(5000).optional(),
  sideEffects:     z.string().max(2000).optional(),
  clientFeedback:  z.string().max(2000).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate:    z.coerce.date().optional(),
}).refine(
  (d) => !d.followUpRequired || !!d.followUpDate,
  { message: 'followUpDate is required when followUpRequired is true' },
);
export type CreateTreatmentRecordDto = z.infer<typeof CreateTreatmentRecordSchema>;

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ClientTag {
  id:    string;
  tag:   string;
  color: string | null;
}

export interface ClientUpcomingBooking {
  id:            string;
  startAt:       string;
  endAt:         string;
  status:        string;
  specialistId:  string;
  specialistName: string;
  serviceName:   string;
  locationName:  string;
  totalPrice:    number;
}

export interface ClientRecentVisit {
  id:             string;
  startAt:        string;
  status:         string;
  specialistName: string;
  serviceName:    string;
  totalPrice:     number;
  totalDuration:  number;
}

export interface ClientLatestNote {
  id:           string;
  content:      string;
  noteType:     string;
  privacy:      string;
  specialistName: string;
  createdAt:    string;
}

// ─── GET /api/v1/clients/[id]/summary ────────────────────────────────────────

export interface ClientSummaryResponse {
  id:              string;
  firstName:       string;
  lastName:        string;
  phone:           string | null;
  email:           string | null;
  avatarUrl:       string | null;
  loyaltyTier:     string | null;
  loyaltyPoints:   number;
  totalVisits:     number;
  totalSpent:      number;
  lastVisitAt:     string | null;
  isBlacklisted:   boolean;
  tags:            ClientTag[];
  nextBooking:     ClientUpcomingBooking | null;
  recentVisits:    ClientRecentVisit[];   // last 3
}

// ─── GET /api/v1/clients/[id] — full profile ─────────────────────────────────

export interface PreferredService {
  id:    string;
  name:  string;
  count: number;
}

export interface PreferredSpecialist {
  id:   string;
  name: string;
}

export interface ClientProfileResponse {
  // Identity
  id:             string;
  firstName:      string;
  lastName:       string;
  phone:          string | null;
  email:          string | null;
  avatarUrl:      string | null;
  dateOfBirth:    string | null;
  age:            number | null;
  gender:         string | null;
  registeredAt:   string;
  status:         string;
  referralSource: string | null;

  // CRM tiers & balances
  loyaltyTier:    string | null;
  loyaltyPoints:  number;
  prepaidBalance: number;
  isBlacklisted:  boolean;
  tags:           ClientTag[];

  // Visit summary (computed)
  totalVisits:      number;
  totalSpent:       number;
  avgSpendPerVisit: number;
  lastVisitAt:      string | null;
  firstVisitAt:     string | null;

  // Reliability stats
  noShowCount:       number;
  cancellationCount: number;
  referralsMade:     number;

  // Preferences
  preferredSpecialist: PreferredSpecialist | null;
  preferredServices:   PreferredService[];

  // Tab 1 — Overview quick data
  upcomingBookings: ClientUpcomingBooking[];   // max 3
  recentVisits:     ClientRecentVisit[];        // max 5
  latestNote:       ClientLatestNote | null;
}

// ─── GET /api/v1/clients/[id]/bookings ───────────────────────────────────────

export interface ClientBookingItem {
  id:             string;
  startAt:        string;
  endAt:          string;
  status:         string;
  specialistId:   string;
  specialistName: string;
  locationName:   string;
  totalDuration:  number;
  totalPrice:     number;
  services: {
    id:       string;
    name:     string;
    price:    number;
    duration: number;
  }[];
}

export interface ClientBookingHistoryResponse {
  items: ClientBookingItem[];
  total: number;
  page:  number;
  limit: number;
}

// ─── GET /api/v1/clients/[id]/treatments ────────────────────────────────────

export interface TreatmentPhoto {
  id:           string;
  photoType:    string;
  imageUrl:     string;
  thumbnailUrl: string | null;
  takenAt:      string;
}

export interface ClientTreatmentItem {
  id:              string;
  performedAt:     string;
  serviceId:       string;
  serviceName:     string;
  specialistId:    string;
  specialistName:  string;
  results:         string | null;
  sideEffects:     string | null;
  clientFeedback:  string | null;
  followUpRequired: boolean;
  followUpDate:    string | null;
  photos:          TreatmentPhoto[];
}

export interface ClientTreatmentResponse {
  items: ClientTreatmentItem[];
  total: number;
  page:  number;
  limit: number;
}

// ─── GET /api/v1/clients/[id]/transactions ───────────────────────────────────

export interface ClientTransactionItem {
  id:            string;
  date:          string;
  amount:        number;
  type:          string;
  description:   string;
  status:        string;
  appointmentId: string | null;
}

export interface ClientTransactionResponse {
  items:              ClientTransactionItem[];
  total:              number;
  page:               number;
  limit:              number;
  totalPaid:          number;
  totalRefunded:      number;
  outstandingBalance: number;
  prepaidBalance:     number;
}

// ─── POST /api/v1/clients/[id]/notes — response ───────────────────────────────

export interface ClientNoteResponse {
  id:         string;
  content:    string;
  noteType:   string;
  privacy:    string;
  authorId:   string;
  authorName: string;
  createdAt:  string;
}

// ─── POST /api/v1/clients/[id]/treatments — response ─────────────────────────

export type CreateTreatmentResponse = ClientTreatmentItem;
