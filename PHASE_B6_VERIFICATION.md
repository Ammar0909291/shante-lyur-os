# Phase B6 Verification — Analytics UI Wiring

## Status: COMPLETE ✓

### Lint
`npm run lint` → clean (0 errors, 1 pre-existing warning in avatar.tsx)

### Type-check
`npm run typecheck` → clean (0 errors)

### Tests
`npx jest --forceExit` → **231 passed, 0 failed** (unchanged from B5 — B6 is UI only)

### Files Changed / Created

| File | Change |
|---|---|
| `src/app/(dashboard)/analytics/financial/page.tsx` | New: Financial Analytics UI |
| `src/app/(dashboard)/analytics/massage/page.tsx` | New: Massage Workload UI |
| `src/contexts/language.tsx` | Added 20 translation keys (RU + EN) for both new pages |
| `src/app/(dashboard)/analytics/page.tsx` | Added `Link` import + sub-navigation block |

### New Pages

#### `/analytics/financial`
- **Date range presets**: 7 days, 30 days, 90 days + custom date inputs
- **KPI row**: Total revenue (with trend vs last period), session count, avg ticket, top earning day
- **Revenue by category**: Horizontal BarChart, sorted desc
- **Specialist type split**: MASSAGE / COSMETOLOGY revenue cards
- **Peak hours heatmap**: 7×15 grid (Пн–Вс × 07–21), champagne colour intensity
- **7-day forecast chart**: Dual-series AreaChart — historical (solid champagne) + forecast (dashed sage), legend with rolling avg/day and confidence
- **Revenue by day**: AreaChart for selected period

#### `/analytics/massage`
- **Date picker** with "Сегодня" quick-reset button
- **Summary KPIs**: totalMassageSpecialists, workingToday, meetingTarget, belowTarget, overridden
- **Alerts panel** (collapsible): severity badges (critical=red, warning=amber, info=sage), bilingual messages, critical count badge
- **Specialist cards**: progress bar (sessionWeight / 6.0), colour-coded (green ≥ 100%, amber ≥ 50%, red < 50%), scheduling recommendation, override reason
- **Override modal**: textarea for reason, POST to `/api/analytics/massage/override`
- **Remove override**: DELETE with confirmation, inline on card

### Translation Keys Added

```
analytics.financial.title / subtitle / revenue / sessions / avgTicket
analytics.financial.topDay / byCategory / peakHours / forecast / confidence

analytics.massage.title / subtitle / total / working / meetingTarget
analytics.massage.belowTarget / overridden / alerts / specialists
```
Both RU and EN dictionaries updated.

### Sub-navigation
`/analytics/page.tsx` now renders two quick-links below the header:
- **Финансы** → `/analytics/financial`
- **Нагрузка массажистов** → `/analytics/massage`
