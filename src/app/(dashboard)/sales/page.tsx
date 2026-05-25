'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientRole } from '@/lib/client-auth';
import { toast } from '@/hooks/use-toast';
import { PeriodSelector, type DateRange } from '@/components/sales/PeriodSelector';
import { EmployeeFilter } from '@/components/sales/EmployeeFilter';
import { ServiceFilter } from '@/components/sales/ServiceFilter';
import { SalesKpiStrip } from '@/components/sales/SalesKpiStrip';
import { SalesChart } from '@/components/sales/SalesChart';
import { SalesBreakdownTable } from '@/components/sales/SalesBreakdownTable';
import type {
  SalesSummaryResponse,
  SalesChartResponse,
  SalesBreakdownResponse,
  SalesBreakdownQuery,
} from '@/modules/sales/domain/sales.dto';

const SALES_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

type SortBy  = SalesBreakdownQuery['sortBy'];
type SortDir = 'asc' | 'desc';
type View    = 'employee' | 'service';

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().slice(0, 10);
}

function buildQs(params: Record<string, string | string[] | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length) qs.set(k, v.join(','));
    } else {
      qs.set(k, String(v));
    }
  }
  return qs.toString() ? `?${qs.toString()}` : '';
}

export default function SalesPage() {
  const router = useRouter();
  const role   = getClientRole();

  React.useEffect(() => {
    if (!SALES_ROLES.includes(role)) {
      router.replace('/dashboard');
    }
  }, [role, router]);

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [period,      setPeriod]      = React.useState<DateRange>({ from: daysAgoStr(30), to: todayStr() });
  const [employeeIds, setEmployeeIds] = React.useState<string[]>([]);
  const [serviceIds,  setServiceIds]  = React.useState<string[]>([]);

  // ─── Breakdown state ──────────────────────────────────────────────────────
  const [view,      setView]      = React.useState<View>('employee');
  const [sortBy,    setSortBy]    = React.useState<SortBy>('revenue');
  const [sortOrder, setSortOrder] = React.useState<SortDir>('desc');
  const [page,      setPage]      = React.useState(1);

  // ─── Data state ───────────────────────────────────────────────────────────
  const [summary,    setSummary]   = React.useState<SalesSummaryResponse | null>(null);
  const [chart,      setChart]     = React.useState<SalesChartResponse | null>(null);
  const [breakdown,  setBreakdown] = React.useState<SalesBreakdownResponse | null>(null);

  const [summaryLoading,   setSummaryLoading]   = React.useState(true);
  const [chartLoading,     setChartLoading]     = React.useState(true);
  const [breakdownLoading, setBreakdownLoading] = React.useState(true);
  const [exporting,        setExporting]        = React.useState(false);

  // ─── Fetch helpers ────────────────────────────────────────────────────────
  const baseParams = React.useMemo(() => ({
    from:        period.from,
    to:          period.to,
    employeeIds: employeeIds.length ? employeeIds : undefined,
    serviceIds:  serviceIds.length  ? serviceIds  : undefined,
  }), [period, employeeIds, serviceIds]);

  const fetchSummary = React.useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res  = await fetch(`/api/v1/sales/summary${buildQs(baseParams)}`);
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch {
      toast({ title: 'Ошибка загрузки KPI', variant: 'error' });
    } finally {
      setSummaryLoading(false);
    }
  }, [baseParams]);

  const fetchChart = React.useCallback(async () => {
    setChartLoading(true);
    try {
      const res  = await fetch(`/api/v1/sales/chart${buildQs({ ...baseParams, groupBy: 'total' })}`);
      const json = await res.json();
      if (json.success) setChart(json.data);
    } catch {} finally {
      setChartLoading(false);
    }
  }, [baseParams]);

  const fetchBreakdown = React.useCallback(async () => {
    setBreakdownLoading(true);
    try {
      const res  = await fetch(`/api/v1/sales/breakdown${buildQs({
        ...baseParams,
        view, sortBy, sortOrder,
        page: String(page), limit: '20',
      })}`);
      const json = await res.json();
      if (json.success) setBreakdown(json.data);
    } catch {} finally {
      setBreakdownLoading(false);
    }
  }, [baseParams, view, sortBy, sortOrder, page]);

  React.useEffect(() => { void fetchSummary(); }, [fetchSummary]);
  React.useEffect(() => { void fetchChart(); },   [fetchChart]);
  React.useEffect(() => { void fetchBreakdown(); }, [fetchBreakdown]);

  // Reset page when filters/view/sort change (not when page itself changes)
  const prevBaseRef = React.useRef(baseParams);
  React.useEffect(() => {
    if (prevBaseRef.current !== baseParams || true) {
      setPage(1);
      prevBaseRef.current = baseParams;
    }
  }, [baseParams, view, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sort toggle ──────────────────────────────────────────────────────────
  function handleSort(col: SortBy) {
    if (sortBy === col) {
      setSortOrder((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  }

  // ─── CSV export ───────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/sales/export${buildQs({
        ...baseParams, view, sortBy, sortOrder, limit: '10000',
      })}`);
      if (!res.ok) throw new Error('Export failed');
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = `sales-${period.from}-${period.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Ошибка экспорта', variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  if (!SALES_ROLES.includes(role)) return null;

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Продажи</h1>
            {summary?.periodLabel && (
              <p className="text-sm text-text-muted mt-0.5">{summary.periodLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              'bg-charcoal border border-border-luxury hover:border-border-light text-text-secondary hover:text-text-primary',
              exporting && 'opacity-60 cursor-not-allowed',
            )}
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Экспорт…' : 'Экспорт CSV'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <div className="h-5 w-px bg-border-luxury hidden sm:block" />
          <EmployeeFilter selected={employeeIds} onChange={setEmployeeIds} />
          <ServiceFilter  selected={serviceIds}  onChange={setServiceIds}  />
        </div>

        {/* KPI strip */}
        <SalesKpiStrip data={summary} loading={summaryLoading} />

        {/* Chart */}
        <SalesChart data={chart} loading={chartLoading} />

        {/* Breakdown table */}
        <SalesBreakdownTable
          data={breakdown}
          loading={breakdownLoading}
          view={view}
          onView={(v) => { setView(v); setPage(1); }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          onPage={setPage}
        />

      </div>
    </div>
  );
}
