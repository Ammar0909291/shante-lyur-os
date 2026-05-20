# Next UI — Migration Guide

## How the parallel system works

1. **UIVersionProvider** (`src/contexts/ui-version.tsx`) — stores `'legacy' | 'next'` in `localStorage`.
2. **Dashboard layout** (`src/app/(dashboard)/layout.tsx`) — reads the version and renders either `LegacyShell` or `NextUIShell`. This switches the sidebar + header for ALL pages instantly.
3. **UIPageWrapper** (`src/next-ui/components/UIPageWrapper.tsx`) — per-page switch. Wrap a page's JSX to independently migrate content.
4. **UIVersionToggle** (`src/next-ui/components/UIVersionToggle.tsx`) — rendered in both legacy and next headers so the toggle is always accessible.

## Migration order (recommended)

| Phase | What | Status |
|-------|------|--------|
| 1 | Global layout (sidebar, header) | ✅ Done |
| 2 | Dashboard page content | ✅ Done |
| 3 | Analytics | Pending |
| 4 | Bookings | Pending |
| 5 | Specialists | Pending |
| 6 | Clients | Pending |
| 7 | Finance / Sales | Pending |
| 8 | Settings, Profile | Pending |

## How to migrate a page

### Step 1 — Create the Next UI content component

```tsx
// src/next-ui/analytics/NextAnalytics.tsx
'use client';
export function NextAnalytics({ data }: { data: AnalyticsData }) {
  return <div>... new design ...</div>;
}
```

### Step 2 — Wrap the existing page

```tsx
// src/app/(dashboard)/analytics/page.tsx
import { UIPageWrapper } from '@/next-ui/components/UIPageWrapper';
import { NextAnalytics } from '@/next-ui/analytics/NextAnalytics';

export default async function AnalyticsPage() {
  const data = await getAnalyticsData(); // existing server-side fetch
  return (
    <UIPageWrapper
      legacy={<LegacyAnalyticsJSX data={data} />}
      next={<NextAnalytics data={data} />}
    />
  );
}
```

### Step 3 — Test both UIs

Toggle between Legacy and Next UI in the header. Both must work before merging.

## Rollback

To instantly disable Next UI for all users:

```tsx
// src/contexts/ui-version.tsx
// Change the useState default:
const [version, setVersionState] = React.useState<UIVersion>('legacy');
// OR set STORAGE_KEY to a different key so all users get a fresh default
```

## Shared logic (do NOT duplicate)

All data fetching, business logic, and API calls stay in:
- `src/app/api/**` — unchanged
- `src/infrastructure/**` — unchanged
- `src/lib/**` — unchanged

Only the **presentation layer** moves into `src/next-ui/**`.
