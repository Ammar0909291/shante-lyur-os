# Phase B3 Verification — Specialist Performance Analytics

## Status: COMPLETE ✓

### Lint
`npm run lint` → clean (0 errors, 1 pre-existing warning in avatar.tsx)

### Type-check
`npm run typecheck` → clean (0 errors)

### Tests
`npx jest --forceExit` → **154 passed, 0 failed** (was 123 after B2; +31 new B3 tests)

### Files Changed / Created

| File | Change |
|---|---|
| `src/types/analytics.ts` | Added 5 new types: `ServiceCategoryBreakdown`, `DailySessionPoint`, `TopService`, `SpecialistPerformanceSummary`, `SpecialistPerformanceDetail` |
| `src/app/api/analytics/specialists/route.ts` | New: list endpoint with ?type filter, retention rate, compliance, trend |
| `src/app/api/analytics/specialists/[id]/performance/route.ts` | New: detail endpoint with byServiceCategory, dailySessions (30-entry), topServices |
| `tests/integration/specialist-performance.test.ts` | New: 31 integration tests (16 list + 15 detail) |

### New Endpoints

#### `GET /api/analytics/specialists`
- Auth: `x-user-id` + `x-user-role` (SUPER_ADMIN|ADMIN|OPERATOR only)
- Optional query: `?type=MASSAGE|COSMETOLOGY`, `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`
- Default window: last 30 days
- Returns: `SpecialistPerformanceSummary[]`

#### `GET /api/analytics/specialists/[id]/performance`
- Same auth requirements
- Optional query: `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`
- Returns: `SpecialistPerformanceDetail` (extends summary + breakdown arrays)
- 404 when specialist not found

### Business Rules Implemented

| Rule | Implementation |
|---|---|
| `workloadCompliance` | Working days (≥1 completed apt) vs compliant days (totalDuration ≥ 360 min), × 100. **null for COSMETOLOGY** |
| `clientRetentionRate` | clients with 2+ visits / total unique clients × 100 |
| `trendVsLastMonth` | `pct(currentRevenue, prevPeriodRevenue)` — 0 when prev is 0 |
| `dailySessions` | Exactly 30 entries (default window), zero-filled per day |
| `topServices` | Sorted by sessionCount desc, max 10 entries |
| Specialist type | Runtime-derived: 'массаж'/'spa'/'спа' in specialization → MASSAGE, else COSMETOLOGY |

### Test Coverage (31 tests)

**List endpoint (16 tests):**
- Shape validation
- Correct array length (one entry per specialist)
- Type tagging (MASSAGE vs COSMETOLOGY)
- Full name composition
- totalSessions, revenueGenerated, avgSessionDuration
- clientRetentionRate calculation (50% for 1 repeat / 2 unique)
- workloadCompliance null for COSMETOLOGY, number for MASSAGE
- trendVsLastMonth: 0 on zero previous, 20% on (12000 vs 10000)
- Empty array on no match
- 401 / 403 auth

**Detail endpoint (15 tests):**
- 404 for unknown specialist
- Full shape with all extended fields
- workloadCompliance null/number by type
- dailySessions: exactly 30 entries, correct structure, zero-filled
- byServiceCategory: grouping and avgDuration
- topServices: sort order
- totalUniqueClients, repeatClientRatio
- trendVsLastMonth: 0 on zero previous
- 401 / 403 auth
