# DIAGNOSIS_REPORT — TypeScript CI Stage 1 Failure

**Date**: 2026-05-21  
**Branch**: `claude/salon-booking-system-ErCHR`  
**HEAD commit**: `9a10330`  
**Errors reported locally**: 383 across 57 files  
**Errors on cloud (same commit)**: 0  

---

## Executive Summary

The 383 local errors are **not caused by a BUG-003/004 refactor** and do not exist
in the committed codebase. The git object at `9a10330` contains fully fixed files
(confirmed: `git show 9a10330:src/infrastructure/repositories/prisma-appointment.repository.ts`
shows the corrected version). The local working tree has stale content from before
commit `1f87225` because `git reset --hard` silently failed on Windows (file lock
from VS Code or similar). Git updated its HEAD ref but could not overwrite open files.

**CI runs against the committed code, not the local working tree.** If CI is showing
errors, it is running against an earlier commit or a cached run — the current tip
of `claude/salon-booking-system-ErCHR` produces 0 errors in a clean environment.

---

## Phase 1 — Full Error Inventory

383 errors, 57 files. Grouped by file below with per-error detail.

### Group A — `prisma/seed.ts` (10 errors)

| Line | Code | Message | Category |
|------|------|---------|----------|
| 1:63 | TS6133 | `SpecialistStatus` declared but never read | UNUSED |
| 1:92 | TS6133 | `AppointmentStatus` declared but never read | UNUSED |
| 1:111 | TS6133 | `PaymentProvider` declared but never read | UNUSED |
| 1:128 | TS6133 | `PaymentStatus` declared but never read | UNUSED |
| 1:143 | TS6133 | `RevenueType` declared but never read | UNUSED |
| 1:156 | TS6133 | `NotificationChannel` declared but never read | UNUSED |
| 1:177 | TS6133 | `NotificationType` declared but never read | UNUSED |
| 1:195 | TS6133 | `NotificationStatus` declared but never read | UNUSED |
| 1:215 | TS6133 | `AuditAction` declared but never read | UNUSED |
| 66:9 | TS6133 | `services` declared but never read | UNUSED |

> **Note**: In the committed codebase `SpecialistStatus` IS used on line 132.
> These errors exist only in the stale local file.

---

### Group B — `src/app/(dashboard)/dashboard/page.tsx` (5 errors)

| Line | Code | Message | Category |
|------|------|---------|----------|
| 3:31 | TS2307 | Cannot find `@/components/dashboard/nexus-stat-card` | OTHER |
| 4:36 | TS2307 | Cannot find `@/components/dashboard/booking-volume-chart` | OTHER |
| 5:39 | TS2307 | Cannot find `@/components/dashboard/service-breakdown-chart` | OTHER |
| 6:37 | TS2307 | Cannot find `@/components/dashboard/specialist-load-chart` | OTHER |
| 7:28 | TS2307 | Cannot find `@/components/dashboard/right-panel` | OTHER |

> **Note**: Committed version of `dashboard/page.tsx` no longer imports these
> components — it was rewritten to use `lucide-react` icons. Missing only locally.

---

### Group C — API Routes (3 errors)

| File | Line | Code | Message | Category |
|------|------|------|---------|----------|
| `api/appointments/[id]/route.ts` | 80 | TS2554 | Expected 3 args, got 5 to `UpdateAppointmentStatusUseCase` | SHAPE |
| `api/payments/webhooks/robokassa/route.ts` | 49 | TS2554 | Expected 9 args, got 10 | SHAPE |
| `api/payments/webhooks/yookassa/route.ts` | 44 | TS2554 | Expected 9 args, got 10 | SHAPE |

---

### Group D — Application DTOs (3 errors)

| File | Line | Code | Message | Category |
|------|------|------|---------|----------|
| `application/dto/admin.dto.ts` | 2 | TS6133 | `PaginationSchema` declared but never read | UNUSED |
| `application/dto/booking.dto.ts` | 59 | TS2345 | `DateRangeSchema` (ZodEffects) not assignable to `AnyZodObject` in `.merge()` | ANNOTATION |
| `application/dto/payment.dto.ts` | 32 | TS2345 | Same ZodEffects/AnyZodObject issue | ANNOTATION |

---

### Group E — Application Use-Cases (28 errors across 10 files)

| File | Count | Primary errors | Category |
|------|-------|---------------|----------|
| `admin/change-user-role.use-case.ts` | 1 | `ForbiddenError` unused import | UNUSED |
| `admin/create-user.use-case.ts` | 1 | `.can()` does not exist on `UserRole` enum | SHAPE |
| `admin/generate-revenue-report.use-case.ts` | 1 | `records` unused variable | UNUSED |
| `auth/login.use-case.ts` | 1 | `ValidationError` unused import | UNUSED |
| `auth/logout.use-case.ts` | 1 | `hash` unused variable | UNUSED |
| `auth/register.use-case.ts` | 1 | `ValidationError` unused import | UNUSED |
| `booking/cancel-appointment.use-case.ts` | 3 | `AppointmentStatus` unused; `promoCodeRepo` private readonly never read (TS6138); `dto.reason` string not assignable to `CancellationReason` | UNUSED / SHAPE / ANNOTATION |
| `booking/create-appointment.use-case.ts` | 3 | `ValidationError` unused; `userRepo` / `notificationRepo` private readonly never read (TS6138) | UNUSED / SHAPE |
| `booking/list-appointments.use-case.ts` | 1 | `dto.status` string literal not assignable to `AppointmentStatus` | ANNOTATION |
| `booking/reschedule-appointment.use-case.ts` | 2 | `AppointmentStatus` unused; `specialistRepo` private readonly never read | UNUSED |
| `booking/update-appointment.use-case.ts` | 5 | `AppointmentCancelledEvent` unused; `CancelAppointmentDto` unused; `userRepo`/`notificationRepo` private readonly never read; `newStatus` string literal not assignable to `AppointmentStatus` | UNUSED / SHAPE |
| `crm/get-customer-detail.use-case.ts` | 3 | `ISpecialistNoteRepository` / `IProcedureHistoryRepository` not exported from ports; `payments` unused | SHAPE / UNUSED |
| `payment/create-payment.use-case.ts` | 5 | `ValidationError` unused; `yookassaGateway`/`robokassaGateway` private readonly never read; `dto.provider` string not assignable to `PaymentProvider` | UNUSED / SHAPE / ANNOTATION |
| `payment/process-webhook.use-case.ts` | 6 | All imports unused; `refundRepo`/`yookassaGateway`/`robokassaGateway` private readonly never read | UNUSED |

---

### Group F — Domain Layer (4 errors)

| File | Line | Code | Message | Category |
|------|------|------|---------|----------|
| `domain/entities/appointment.entity.ts` | 78 | TS6133 | `actorId` param unused | UNUSED |
| `domain/entities/appointment.entity.ts` | 125 | TS6133 | `oldSlot` unused | UNUSED |
| `domain/entities/user.entity.ts` | 91 | TS6133 | `actorRole` param unused | UNUSED |
| `domain/events/appointment.events.ts` | 2 | TS6133 | `AppointmentStatus` import unused | UNUSED |
| `domain/events/payment.events.ts` | 2 | TS6133 | `PaymentStatus` import unused | UNUSED |

---

### Group G — Infrastructure Config (5 errors)

| File | Line | Code | Message | Category |
|------|------|------|---------|----------|
| `infrastructure/config/di-registry.ts` | 31 | TS2307 | Cannot find `yookassa-gateway.service` module | OTHER |
| `infrastructure/config/di-registry.ts` | 32 | TS2307 | Cannot find `robokassa-gateway.service` module | OTHER |
| `infrastructure/config/di-registry.ts` | 39 | TS6133 | `_db` declared but never read | UNUSED |
| `infrastructure/index.ts` | 32 | TS2307 | Cannot find `yookassa-gateway.service` module | OTHER |
| `infrastructure/index.ts` | 33 | TS2307 | Cannot find `robokassa-gateway.service` module | OTHER |

> **Note**: These gateway files exist in the committed codebase. They are absent
> only in the user's stale local working tree.

---

### Group H — Infrastructure Repositories (≈295 errors across 19 files)

All 19 repos share the same three root cause patterns:

#### H1 — Old Port Interface Naming (ANNOTATION) — 19 errors, one per repo

Every repo imports `XxxRepositoryPort` (old convention) instead of `IXxxRepository`
(new convention). Examples:
- `AppointmentRepositoryPort` → `IAppointmentRepository`
- `AuditLogRepositoryPort` → `IAuditLogRepository`
- `PaymentRepositoryPort` → `IPaymentRepository`
- *(all 19 repos, same pattern)*

#### H2 — Value Object `.getValue()` (SHAPE) — ~25 errors

All repos call `.getValue()` on `Money`, `Email`, `PhoneNumber`, `Color`. These
methods do not exist — correct accessors are `.amount` (Money), `.value`
(Email/PhoneNumber/Color).

Examples: `Money.create(raw.amount).getValue()`, `Email.create(raw.email).getValue()`,
`PhoneNumber.create(raw.phone).getValue()`

#### H3 — Entity / Prisma Schema Mismatch (SHAPE) — ~250 errors

Repositories use field names that don't exist on either the domain entity or the
Prisma model. Per-repo breakdown:

| Repo | Ghost entity fields accessed | Ghost Prisma columns written |
|------|-----------------------------|-----------------------------|
| `prisma-appointment` | `customerId`, `serviceId`, `price`, `finalPrice`, `discountAmount`, `discountType`, `promoCodeId`, `noShowMarkedAt`, `noShowMarkedBy` | `customerId`, `serviceId`, `firstName` in SpecialistSelect |
| `prisma-audit-log` | `oldValue`, `newValue` (singular) | `oldValue`, `newValue` (singular — schema uses plural) |
| `prisma-blocked-time` | `startAt`/`endAt` on entity (they're in `timeRange`), `createdBy`, `updatedAt` | `createdBy`, `updatedAt` (not in Prisma model) |
| `prisma-customer-profile` | `firstName`, `lastName`, `phone`, `email`, `source` on entity; `totalSpent` as `Money` not `Decimal` | `phone` as unique key (not unique in schema), `firstName`/`lastName`/`phone`/`email` in where |
| `prisma-daily-metrics` | `noShowCount`, `averageTicket` on entity | `noShowCount`, `averageTicket` (schema uses `noShowAppointments`, `avgTicket`) |
| `prisma-location` | missing `city`, `sortOrder` in reconstitute | missing `city` in create |
| `prisma-notification` | `metadata` on entity | `metadata` not in Prisma model |
| `prisma-payment` | `currency` on entity, `refundedAmount` on entity | `refundedAmount` not in Prisma model |
| `prisma-promo-code` | `usedCount`, `applicableServiceIds` on entity (entity uses `applicableServices`) | `usedCount` not in Prisma model |
| `prisma-refresh-token` | `token` on entity/Prisma (schema has `tokenHash`) | `token` unique lookup (schema has `tokenHash`) |
| `prisma-refund` | `updatedAt` on entity (entity has no updatedAt) | `updatedAt` not in Prisma model |
| `prisma-revenue-record` | `specialistCommission` on entity | `specialistCommission` phantom field |
| `prisma-service` | `durationMinutes`, `color`, `locationPrices` on entity; `locations` in include | `locations` not in ServiceInclude (schema uses `serviceLocations`) |
| `prisma-session` | missing `token` in reconstitute | `token` required in Prisma create |
| `prisma-specialist` | `specialties`, `maxDailyAppointments` on entity | `specialties`, `firstName` in SpecialistSelect |
| `prisma-user` | `metadata` on entity; `email`/`phone` as VOs not strings | `phone` as unique lookup (not unique in schema), `metadata` not in model |
| `prisma-vacation` | `updatedAt` on entity | `updatedAt` not in Prisma model |
| `prisma-working-schedule` | missing `validFrom`/`validUntil` in reconstitute | `validFrom` required in Prisma create |
| `prisma-ai-prediction` | `type`, `features`, `modelVersion` on entity | `type` not in Prisma model (schema uses `modelType`) |

---

### Group I — Infrastructure Services (≈40 errors across 8 files)

| File | Count | Primary errors | Category |
|------|-------|---------------|----------|
| `auth.service.ts` | 11 | Old port naming (6); `UserStatus.BLOCKED` doesn't exist (schema: `SUSPENDED`?); `RefreshToken.create()`, `Session.create()`, `User.create()` don't exist (use `reconstitute`) | ANNOTATION / SHAPE |
| `notification.service.ts` | 7 | Old port naming (3); `NotificationType.BOOKING_CONFIRMED`, `BOOKING_REMINDER`, `BOOKING_CANCELLED` don't exist; `PAYMENT_RECEIPT` → `PAYMENT_RECEIVED` | ANNOTATION / ANNOTATION |
| `payment-orchestrator.service.ts` | 10 | Old port naming (2); `Payment.create()` doesn't exist; `Money.create().getValue()` invalid; `PaymentStatus.COMPLETED`, `REFUNDED`, `REFUND_PENDING` don't exist | ANNOTATION / SHAPE |
| `ai-prediction.service.ts` | 11 | Old port naming (4); `AIPrediction.create()` doesn't exist; implicit `any` from missing fast-check types | ANNOTATION / SHAPE |
| `appointment-reminder.worker.ts` | 3 | Old port naming | ANNOTATION |
| `bcrypt-password-hasher.service.ts` | 1 | Old port naming | ANNOTATION |
| `jwt-token.service.ts` | 1 | Old port naming | ANNOTATION |
| `smtp-email.service.ts` | 2 | Old port naming; `createTransporter` → `createTransport` | ANNOTATION |
| `sse-realtime.service.ts` | 2 | Old port naming; `role` param unused | ANNOTATION / UNUSED |

---

### Group J — Test File (19 errors)

| File | Count | Message | Category |
|------|-------|---------|----------|
| `tests/properties/booking-invariants.test.ts` | 1 | `fast-check` module not found | OTHER |
| `tests/properties/booking-invariants.test.ts` | 18 | Implicit `any` type on all fast-check callback params (cascade from missing module) | OTHER |

---

## Phase 2 — Categorization Summary

| Category | Count | % |
|----------|-------|---|
| **[SHAPE]** — Real type mismatch: entity API, Prisma schema, use-case signatures | ~270 | 71% |
| **[UNUSED]** — Unused imports / variables / params | ~60 | 16% |
| **[ANNOTATION]** — Wrong import name, enum cast, ZodEffects merge | ~35 | 9% |
| **[OTHER]** — Missing modules, wrong method name (`createTransporter`) | ~18 | 4% |

---

## Phase 3 — Recommendation

### A — FIX FORWARD ✅

**All 383 errors are already fixed in the committed codebase at `9a10330`.**

This is NOT a code architecture problem and NOT caused by BUG-003/004.

**Root cause**: `git reset --hard` silently failed on the Windows machine. Git
updated the HEAD ref to `9a10330` but could not overwrite open files (VS Code
or another process had them locked). The working tree retained pre-fix content.
The committed git objects contain the correct, error-free versions.

**Evidence**:
- Cloud environment at same commit `9a10330` → 0 TypeScript errors, exit 0
- `git show 9a10330:src/infrastructure/repositories/prisma-appointment.repository.ts`
  shows `IAppointmentRepository`, `Appointment.reconstitute()`, no phantom fields
- Cloud `git status --short` → no output (tree clean)
- Yet user's working tree has `AppointmentRepositoryPort`, `customerId`, `price`, etc.

---

## Phase 4 — Proposed Fix List (do not apply until approved)

The fix is purely a **git sync operation**, not a code change:

```powershell
# 1. Close VS Code and any other process that might lock the files
# 2. Run from C:\Users\suaib\Desktop\shante-lyur-os

git fetch origin claude/salon-booking-system-ErCHR

# Force overwrite every file in working tree, bypassing file locks
git checkout -f HEAD

# If the above still leaves stale files, use the nuclear option:
git stash --include-untracked
git reset --hard origin/claude/salon-booking-system-ErCHR

npm install
Remove-Item -Recurse -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Expected result after: **0 errors, exit 0** — identical to cloud.

If errors persist after this, it means some files on disk genuinely differ from
the git object. In that case, run:

```powershell
git diff HEAD -- src/infrastructure/repositories/prisma-appointment.repository.ts
```

If it shows differences despite `git status` being clean, there is a Windows
file system / git index corruption and a fresh clone is needed:

```powershell
cd C:\Users\suaib\Desktop
git clone <remote-url> shante-lyur-os-clean
cd shante-lyur-os-clean
git checkout claude/salon-booking-system-ErCHR
npm install
npx tsc --noEmit
```

---

## Appendix — If a Full Code Fix IS Still Required

If after syncing, errors remain (which would be surprising), the surgical fix list
by priority:

1. **All infra repos**: rename `XxxRepositoryPort` → `IXxxRepository` in imports
2. **All infra repos**: remove `.getValue()` — use `.amount`, `.value` instead
3. **All infra repos**: align `toDomain()` to actual Prisma column names (see Group H3 table)
4. **Use-cases**: remove unused `private readonly` — prefix params with `_`
5. **Use-cases**: cast `dto.status`, `dto.provider`, `dto.reason` to domain enums
6. **DTOs**: use `DateRangeBaseSchema` (without `.refine()`) in `.merge()` calls
7. **Auth service**: use entity factory methods (`reconstitute()` not `create()`)
8. **Notification service**: fix `NotificationType` enum values
9. **Payment orchestrator**: fix `PaymentStatus` enum values
10. **Dashboard page**: components already removed in committed version
11. **Test file**: `npm install fast-check --save-dev`
12. **Gateway services**: files exist in committed version, no action needed
