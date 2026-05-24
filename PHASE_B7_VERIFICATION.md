# Phase B7 Verification — Excel Export

## Status: COMPLETE ✓

### Lint
`npm run lint` → clean (0 errors, 1 pre-existing warning in avatar.tsx)

### Type-check
`npm run typecheck` → clean (0 errors)

### Tests
`npx jest --forceExit` → **253 passed, 0 failed** (was 231 after B6; +22 new B7 tests)

### Files Changed / Created

| File | Change |
|---|---|
| `src/app/api/analytics/export/_xlsx.ts` | New: shared XLSX helpers |
| `src/app/api/analytics/export/specialists/route.ts` | New: specialists export |
| `src/app/api/analytics/export/massage-workload/route.ts` | New: massage workload export |
| `src/app/api/analytics/export/financial/route.ts` | New: financial export (3 sheets) |
| `src/app/api/analytics/export/bookings/route.ts` | New: bookings export |
| `src/app/(dashboard)/analytics/financial/page.tsx` | Export button added |
| `src/app/(dashboard)/analytics/massage/page.tsx` | Export button added |
| `tests/integration/analytics-export.test.ts` | New: 22 integration tests |

### xlsx Library
Used existing `xlsx@0.18.5` (SheetJS) — already in package.json. No new packages added.

### New Endpoints

#### `GET /api/analytics/export/specialists`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?type=MASSAGE|COSMETOLOGY`
- File: `specialists-performance-{YYYY-MM-DD}.xlsx`
- Sheet "Специалисты": Специалист | Тип | Сеансов | Выручка | Ср. продолж. | Удержание % | Соответствие % | Тренд %

#### `GET /api/analytics/export/massage-workload`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?date=YYYY-MM-DD` (default: today)
- File: `massage-workload-{date}.xlsx`
- Sheet "Нагрузка массажистов": Специалист | Сеансов | Нагрузка | Норма выполнена | До нормы | Статус | Причина снятия

#### `GET /api/analytics/export/financial`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`
- File: `financial-report-{from}_{to}.xlsx`
- Sheet 1 "Выручка по дням": Дата | Выручка | Кол-во сеансов (zero-filled)
- Sheet 2 "По категориям": Категория | Выручка | Сеансов | Средний чек | Доля % + specialist type breakdown
- Sheet 3 "Пиковые часы": День недели | Час | Записей | Выручка

#### `GET /api/analytics/export/bookings`
- Auth: SUPER_ADMIN | ADMIN | OPERATOR
- Query: `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`
- File: `bookings-{from}_{to}.xlsx`
- Sheet "Записи": Дата | Время | Клиент | Специалист | Услуга(и) | Тип | Продолж. | Статус | Выручка

### Formatting Applied

| Feature | Status |
|---|---|
| Timestamp in A1 (`Сформировано: DD.MM.YYYY HH:mm`) | ✓ |
| Russian sheet names | ✓ |
| Auto column widths (via `!cols`) | ✓ |
| Freeze header row (via `!sheetViews`) | ✓ |
| Date columns formatted DD.MM.YYYY | ✓ (as strings) |
| Status labels translated to Russian | ✓ |
| Bold header / background color | — (requires xlsx-style / exceljs Pro) |
| Alternating row colors | — (requires xlsx-style / exceljs Pro) |

### Export Buttons Added

- `/analytics/financial` — top-right, "Экспорт .xlsx" with Download icon; passes current `from`/`to`
- `/analytics/massage` — top-right, "Экспорт .xlsx" with Download icon; passes current `date`
- Both: loading spinner (Loader2) while generating; shows error banner on failure
- Pattern: `fetch → blob → URL.createObjectURL → <a>.click() → revokeObjectURL`

### Test Coverage (22 tests)

**Specialists (6 tests):** 200 + xlsx, filename, empty appointments, type filter, date range filter, 401

**Massage Workload (5 tests):** 200 + xlsx, filename, date param, no massage specialists → valid xlsx, 401

**Financial (5 tests):** 200 + xlsx, filename, date range, empty period → valid xlsx, 401

**Bookings (6 tests):** 200 + xlsx, filename, date range, empty period → valid xlsx, 401, 403 for CLIENT

### NEXT BUILD PROMPT

Phase B8 — Client Retention Analytics:
- `GET /api/analytics/clients/retention` — cohort retention, churn rate, avg visit frequency, lifetime value
- `GET /api/analytics/clients/segments` — VIP/regular/at-risk segmentation based on visit patterns
- `/analytics/clients` page connecting both endpoints
