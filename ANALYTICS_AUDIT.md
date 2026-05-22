# Analytics Audit — Phase B1

## Phase 1 Findings

### Relevant Models

**Appointment** — primary analytics source
- `startAt`, `endAt` (DateTime) — indexed on `(status, startAt)`, `(specialistId, startAt)`
- `status` (AppointmentStatus) — PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW | RESCHEDULED
- `totalPrice` (Decimal 10,2) — revenue field
- `totalDuration` (Int, minutes) — used for massage workload calculation
- `specialistId` — FK to Specialist
- `clientId` — FK to User

**Specialist**
- `specialization` (String?) — type derived at runtime: contains 'массаж'/'spa'/'спа' → MASSAGE, else → COSMETOLOGY
- `status` (SpecialistStatus) — ACTIVE | INACTIVE | ON_VACATION | TERMINATED
- No stored `specialistType` column — always runtime-derived

**Service**
- `category` (ServiceCategory) — COSMETOLOGY | MASSAGE | INJECTION | LASER | BODY_CONTOURING | HAIR_REMOVAL | FACIAL | OTHER
- `basePrice` (Decimal 10,2)

**Location**
- `timezone` (String, default "Europe/Moscow") — used for local-day calculations

**DailyMetrics** — pre-aggregated, available for high-level queries
- `date`, `totalAppointments`, `completedAppointments`, `cancelledAppointments`, `totalRevenue`, `newCustomers`

**RevenueRecord** — indexed on `(date, type)`, `(specialistId, date)`
- Not used in Phase B1 (appointments are the source of truth for KPIs)

### Dashboard Page Current State (`app/(dashboard)/dashboard/page.tsx`)
- Direct Prisma calls (4 separate queries)
- Fetches: today count, pending count, month revenue (COMPLETED only), today appointment list
- No trend data, no specialist type breakdown, no workload alerts
- Has `export const dynamic = 'force-dynamic'`

### Existing Analytics API
- `GET /api/analytics` — rich time-series analytics (range, groupBy, specialist filter)
- No `/api/analytics/dashboard/` namespace exists yet

### Schema Gaps for Phase B1
- No `MassageWorkloadOverride` table → `overridden` field stubs as 0 with TODO
- `deriveSpecialistType` not in shared module → creating `src/app/api/specialists/_shared.ts`

### Indexes Available for KPI Queries
- `Appointment(status, startAt)` — used by revenue (COMPLETED filter) and booking counts
- `Appointment(specialistId, startAt)` — used by workload and per-specialist queries
- `Specialist` — no composite index; full scan acceptable for small specialist counts
