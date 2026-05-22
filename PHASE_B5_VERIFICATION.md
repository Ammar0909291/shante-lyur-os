# Phase B5 Verification — Financial / Profitability Analytics

## Status: COMPLETE ✓

### Lint
`npm run lint` → clean (0 errors, 1 pre-existing warning in avatar.tsx)

### Type-check
`npm run typecheck` → clean (0 errors)

### Tests
`npx jest --forceExit` → **231 passed, 0 failed** (was 192 after B4; +39 new B5 tests)

### Files Changed / Created

| File | Change |
|---|---|
| `src/types/analytics.ts` | Added 9 new types for financial analytics |
| `src/app/api/analytics/financial/revenue/route.ts` | New: detailed revenue breakdown |
| `src/app/api/analytics/financial/peak-hours/route.ts` | New: bookings heatmap by hour × day-of-week |
| `src/app/api/analytics/financial/forecast/route.ts` | New: 7-day rolling-average forecast |
| `tests/integration/analytics-financial.test.ts` | New: 39 integration tests |

### New Types

```typescript
FinancialCategoryBreakdown   // per service category: revenue, sessionCount, avgTicket
FinancialBySpecialistType    // MASSAGE vs COSMETOLOGY split
FinancialDayPoint            // { date, revenue, sessionCount } — used in byDay + historicalDays
FinancialTopDay              // { date, revenue }
FinancialRevenueResponse     // full response type for /revenue
PeakHourCell                 // { dayOfWeek, hour, bookingCount, revenue }
PeakHoursResponse            // heatmap + peakHour + peakDay
ForecastConfidence           // 'high' | 'medium' | 'low'
ForecastPoint                // { date, forecastedRevenue, confidence }
FinancialForecastResponse    // historicalDays + forecast + rollingAvg + trend
```

### New Endpoints

#### `GET /api/analytics/financial/revenue`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD` (default: last 30 days)
- Returns: total, byCategory (sorted desc), bySpecialistType, byDay (zero-filled), trend, avgTicket, topEarningDay

#### `GET /api/analytics/financial/peak-hours`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?from`, `?to` (default: last 30 days)
- Returns: heatmap of cells with data (dayOfWeek 0=Mon…6=Sun, hour 0-23), peakHour, peakDay

#### `GET /api/analytics/financial/forecast`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- No query params — always based on last 30 days → forecasts next 7
- Returns: 30 historical days (zero-filled), 7 forecast points (rolling avg), trend, confidence

### Business Logic

| Rule | Implementation |
|---|---|
| `byCategory` revenue | Sums `AppointmentService.price` per `Service.category` |
| `bySpecialistType` revenue | Sums `Appointment.totalPrice` via `deriveSpecialistType()` |
| `byDay` | Zero-filled day-by-day from `from` to `to` in salon timezone |
| `avgTicket` | `total / sessionCount` (0 when no sessions) |
| `topEarningDay` | Day with max revenue from byDay; null if all zero |
| Trend vsLastPeriod | `pct(currentTotal, prevTotal)` — 0 when prev = 0 |
| Peak hours dayOfWeek | 0=Monday … 6=Sunday |
| Rolling average | Mean of last 7 entries in the 30-day historicalDays |
| Trend (forecast) | `last7Avg > prev7Avg * 1.05` → 'up'; `< 0.95` → 'down'; else 'stable' |
| Confidence | CV < 0.3 → 'high'; CV < 0.6 → 'medium'; else 'low'; <7 non-zero days → 'low' |
| forecastedRevenue | `Math.round(rollingAvgRevenue)` for each of the 7 forecast days |

### Test Coverage (39 tests)

**Revenue (16 tests):** shape, total, byCategory split/sort/avgTicket,
bySpecialistType, byDay length/zero-fill, avgTicket, topEarningDay/null,
trend 0 on zero-prev, trend %, 401/403 auth

**Peak hours (9 tests):** shape, cell fields, accumulation for same slot,
separate cells for different hours, peakHour max count, peakDay max revenue,
null peakHour/peakDay on empty, 401/403 auth

**Forecast (14 tests):** shape, historicalDays=30, forecast=7, point fields,
forecastedRevenue=0 when no data, rollingAvg=0/correct, forecastedRevenue=rollingAvg,
trend=stable (no data), confidence values valid, generatedAt ISO, historicalDays fields,
401/403 auth
