# Phase B4 Verification — Massage Workload Analytics

## Status: COMPLETE ✓

### Lint
`npm run lint` → clean (0 errors, 1 pre-existing warning in avatar.tsx)

### Type-check
`npm run typecheck` → clean (0 errors)

### Tests
`npx jest --forceExit` → **192 passed, 0 failed** (was 154 after B3; +38 new B4 tests)

### Schema
`prisma generate` → clean. `WorkloadOverride` model added.
Note: `npx prisma db push` requires a running PostgreSQL instance (not available in CI).
The Prisma client was regenerated from the updated schema and all TypeScript types are correct.

### Files Changed / Created

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `WorkloadOverride` model + `workloadOverrides` relation on `Specialist` |
| `src/app/api/analytics/dashboard/_utils.ts` | Added `getDateBounds(dateStr, timezone)` utility |
| `src/types/analytics.ts` | Added 5 new types: `AlertSeverity`, `MassageSpecialistWorkload`, `MassageWorkloadSummary`, `WorkloadAlert`, `MassageAlertsResponse`, `WorkloadOverrideRecord` |
| `src/app/api/analytics/massage/workload/route.ts` | New: daily workload endpoint |
| `src/app/api/analytics/massage/alerts/route.ts` | New: severity-based alerts endpoint |
| `src/app/api/analytics/massage/override/route.ts` | New: POST + DELETE override management |
| `tests/integration/analytics-massage.test.ts` | New: 38 integration tests |
| `PHASE_B4_VERIFICATION.md` | This file |

### New Schema: WorkloadOverride

```prisma
model WorkloadOverride {
  id           String     @id @default(uuid()) @db.Uuid
  specialistId String     @map("specialist_id") @db.Uuid
  date         DateTime   @db.Date
  reason       String?    @db.VarChar(500)
  overriddenBy String     @map("overridden_by") @db.Uuid
  createdAt    DateTime   @default(now()) @map("created_at")

  specialist Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)

  @@unique([specialistId, date])
  @@index([specialistId, date])
  @@index([date])
  @@map("workload_overrides")
}
```

### New Endpoints

#### `GET /api/analytics/massage/workload`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?date=YYYY-MM-DD` (defaults to today in Europe/Moscow)
- Returns: `MassageWorkloadSummary` with per-specialist breakdown

#### `GET /api/analytics/massage/alerts`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Always uses today's date (real-time)
- Returns: `MassageAlertsResponse` with severity-tagged alerts

#### `POST /api/analytics/massage/override`
- Auth: SUPER_ADMIN | ADMIN only (OPERATOR returns 403)
- Body: `{ specialistId, date, reason? }`
- 201 on create; 409 with existing override on duplicate (idempotent)

#### `DELETE /api/analytics/massage/override`
- Auth: SUPER_ADMIN | ADMIN only
- Body: `{ specialistId, date }`
- 200 on delete; 404 if not found

### Business Rules Implemented

| Rule | Implementation |
|---|---|
| Session weight | `duration >= 85 min → 1.5, else 1.0` |
| Active statuses | PENDING, CONFIRMED, IN_PROGRESS, COMPLETED (excludes CANCELLED, NO_SHOW, RESCHEDULED) |
| Daily target | 6.0 weight units |
| Severity: critical | `sessionWeight < 3 AND hoursLeftInDay < 4` |
| Severity: warning | `sessionWeight < 6 AND NOT overridden` |
| Severity: info | `overridden = true` |
| totalAlerts | Excludes overridden (info) specialists |
| hoursLeftInDay | `max(0, 21:00 - currentTime)` in salon timezone |
| schedulingRecommendation | Non-null when `remaining > 0 AND hoursLeft > 2 AND NOT overridden` |
| Override 409 | Returns existing override (idempotent, not an error) |

### Test Coverage (38 tests)

**Workload endpoint (18 tests):** shape, COSMETOLOGY exclusion, sessionWeight 1.0/1.5/boundary,
targetMet true/false, remainingToTarget, cancelled exclusion, overridden true/false,
schedulingRecommendation, summary counts, 401/403 auth

**Alerts endpoint (8 tests):** below-target filtering, severity critical/warning/info,
bilingual messages, totalAlerts excludes overridden, criticalCount, generatedAt, 401 auth

**Override POST (7 tests):** 201 create, field shape, 409 duplicate, 403 OPERATOR/CLIENT, 401, SUPER_ADMIN allowed

**Override DELETE (4 tests):** 200 delete, 404 not found, 403 OPERATOR, 401
