# Running Tests — Shante Lyur OS

## Quick reference

```powershell
# All tests (unit + integration + properties)
npx jest --forceExit

# Unit tests only (with coverage report)
npm run test:unit

# Integration tests only
npm run test:integration

# Property-based tests only
npm run test:properties

# Watch mode (re-runs on file save)
npm run test:watch

# Single file
npx jest tests/integration/booking-assignment.test.ts --forceExit
```

---

## Test layers

### Unit tests — `tests/unit/`

Pure function tests, no I/O, no mocks required. Run in < 1 s.

| File | What it covers |
|------|----------------|
| `specialist-domain.test.ts` | `Specialist` entity: status transitions, commission calculation, review averaging |
| `booking-time-slots.test.ts` | Conflict detection, 30-min massage buffer, slot-alignment helpers |
| `language-utils.test.ts` | RU/EN translation lookup, fallback behaviour, key symmetry |

### Integration tests — `tests/integration/`

Tests the Next.js route handlers end-to-end (request → response) using mocked Prisma. No database required.

| File | What it covers |
|------|----------------|
| `specialist-creation.test.ts` | POST /api/specialists (validation, 409 dedup, **2 intentional BUG tests**), GET /api/specialists |
| `booking-assignment.test.ts` | POST /api/admin/bookings: massage buffer, admin override, conflict 409 with slot suggestions |

**Intentional failures**: 2 tests in `specialist-creation.test.ts` are marked `BUG:` and deliberately fail. They turn green once `POST /api/specialists` returns `specialistType` and `allowedServiceIds`.

### Property-based tests — `tests/properties/`

Uses [fast-check](https://fast-check.io) with **1 000 random inputs per invariant**.

| File | Invariants checked |
|------|-------------------|
| `booking-invariants.test.ts` | `endTime > startTime`, session count ≤ daily max, 15-min slot alignment, 30-min buffer set membership, specialist count monotonicity |

### E2E tests — `tests/e2e/` (Playwright)

Requires a running server and seeded database. Run separately.

```powershell
# Start server in one terminal
npm run dev

# In another terminal
npx playwright test

# With visible browser (useful for debugging)
npx playwright test --headed

# Playwright UI mode
npm run test:e2e:ui
```

---

## CI pipeline

Defined in `.github/workflows/ci.yml`. Runs on every push to `main`, `master`, or `claude/**` branches.

| Stage | Job | Requires |
|-------|-----|---------|
| 1 | Lint + TypeCheck | — |
| 2 | Unit tests + coverage | Stage 1 |
| 3 | Integration + property tests | Stage 1 |
| 4 | E2E tests (Playwright) | Stages 2 + 3 |
| 5 | Production build verification | Stages 2 + 3 |

---

## Environment variables for tests

Tests read from environment. Defaults are set in `tests/setup.ts` so no `.env` file is required locally.

| Variable | Test default |
|----------|-------------|
| `DATABASE_URL` | `postgresql://localhost:5432/shantelyur_test` |
| `JWT_ACCESS_SECRET` | `test-access-secret-32-chars-minimum` |
| `JWT_REFRESH_SECRET` | `test-refresh-secret-32-chars-minimum` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

---

## Coverage gate

Unit tests enforce 90% coverage thresholds on domain entities. Run `npm run test:unit` to see the report. CI will fail if thresholds are breached.
