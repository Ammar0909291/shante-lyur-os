'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Plus, X, Download, Filter, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatTime, formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useLanguage } from '@/contexts/language';
import { NewBookingDialog } from './_new-booking-dialog';

interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  specialistId: string;
  specialistName: string;
  locationName: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  status: string;
  totalPrice: number;
  totalDuration: number;
  notes: string | null;
  soldByUserId: string | null;
  soldByName: string | null;
  services: { serviceId: string; name: string; price: number; duration: number }[];
}

interface Specialist { id: string; firstName: string; lastName: string; specialization: string | null; allowedServiceIds: string[]; specialistType: 'MASSAGE' | 'COSMETOLOGY'; }
interface Service { id: string; name: string; basePrice: number; baseDuration: number; category: string; isActive?: boolean; }

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const ymd = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'today') {
    return { from: ymd(now), to: ymd(now) };
  }
  if (preset === 'tomorrow') {
    const t = new Date(now); t.setDate(t.getDate() + 1);
    return { from: ymd(t), to: ymd(t) };
  }
  if (preset === 'week') {
    const mon = new Date(now);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    return { from: ymd(mon), to: ymd(sun) };
  }
  if (preset === 'past') {
    const past = new Date(now); past.setFullYear(past.getFullYear() - 5);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    return { from: ymd(past), to: ymd(yesterday) };
  }
  if (preset === 'future') {
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const far = new Date(now); far.setFullYear(far.getFullYear() + 2);
    return { from: ymd(tomorrow), to: ymd(far) };
  }
  return {};
}

const LIMIT = 50;

type AnalyticsPeriod = 'week' | 'month' | 'year';

interface ChartPoint { label: string; bookings: number; revenue: number; }

function buildAnalyticsQuery(period: AnalyticsPeriod): URLSearchParams {
  const q = new URLSearchParams();
  q.set('limit', '1000');
  const now = new Date();
  const ymd = (d: Date) => d.toISOString().split('T')[0];
  if (period === 'week') {
    const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    q.set('from', ymd(mon) + 'T00:00:00.000Z');
    q.set('to', ymd(sun) + 'T23:59:59.999Z');
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    q.set('from', ymd(start) + 'T00:00:00.000Z');
    q.set('to', ymd(end) + 'T23:59:59.999Z');
  } else {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    q.set('from', ymd(start) + 'T00:00:00.000Z');
    q.set('to', ymd(end) + 'T23:59:59.999Z');
  }
  return q;
}

function aggregateChartData(bookings: Booking[], period: AnalyticsPeriod, t: (key: string) => string): ChartPoint[] {
  const days = [
    t('bookings.days.mon'),
    t('bookings.days.tue'),
    t('bookings.days.wed'),
    t('bookings.days.thu'),
    t('bookings.days.fri'),
    t('bookings.days.sat'),
    t('bookings.days.sun'),
  ];
  const months = [
    t('analytics.months.jan'),
    t('analytics.months.feb'),
    t('analytics.months.mar'),
    t('analytics.months.apr'),
    t('analytics.months.may'),
    t('analytics.months.jun'),
    t('analytics.months.jul'),
    t('analytics.months.aug'),
    t('analytics.months.sep'),
    t('analytics.months.oct'),
    t('analytics.months.nov'),
    t('analytics.months.dec'),
  ];

  const map = new Map<string, { bookings: number; revenue: number }>();

  for (const b of bookings) {
    const d = new Date(b.startAt);
    let key: string;
    if (period === 'week') {
      key = days[(d.getDay() + 6) % 7];
    } else if (period === 'month') {
      key = String(d.getDate()).padStart(2, '0');
    } else {
      key = months[d.getMonth()];
    }
    const cur = map.get(key) ?? { bookings: 0, revenue: 0 };
    map.set(key, { bookings: cur.bookings + 1, revenue: cur.revenue + b.totalPrice });
  }

  if (period === 'week') {
    return days.map((l) => ({ label: l, ...( map.get(l) ?? { bookings: 0, revenue: 0 }) }));
  }
  if (period === 'year') {
    return months.map((l) => ({ label: l, ...( map.get(l) ?? { bookings: 0, revenue: 0 }) }));
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, v]) => ({ label, ...v }));
}


const selectCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm cursor-pointer',
  'bg-obsidian border border-border-luxury',
  'text-text-primary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);


export default function BookingsPage() {
  const { t, lang } = useLanguage();

  const STATUS_FILTERS = [
    { value: '', label: t('bookings.status.all') },
    { value: 'PENDING', label: t('bookings.status.pending') },
    { value: 'CONFIRMED', label: t('bookings.status.confirmed') },
    { value: 'IN_PROGRESS', label: t('bookings.status.in_progress') },
    { value: 'COMPLETED', label: t('bookings.status.completed') },
    { value: 'CANCELLED', label: t('bookings.status.cancelled') },
    { value: 'NO_SHOW', label: t('bookings.status.no_show') },
  ];

  const DATE_PRESETS = [
    { value: 'today', label: t('bookings.period.today') },
    { value: 'tomorrow', label: t('bookings.period.tomorrow') },
    { value: 'week', label: t('bookings.period.week') },
    { value: 'past', label: t('bookings.period.past') },
    { value: 'future', label: t('bookings.period.future') },
    { value: '', label: t('bookings.period.all') },
  ];

  const ANALYTICS_PERIODS = [
    { value: 'week' as AnalyticsPeriod, label: t('bookings.view.week') },
    { value: 'month' as AnalyticsPeriod, label: t('bookings.view.month') },
    { value: 'year' as AnalyticsPeriod, label: t('bookings.view.year') },
  ];

  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [allSpecialists, setAllSpecialists] = React.useState<Specialist[]>([]);
  const [allServices, setAllServicesState] = React.useState<Service[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = React.useState<AnalyticsPeriod>('week');
  const [chartData, setChartData] = React.useState<ChartPoint[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState('');
  const [datePreset, setDatePreset] = React.useState('today');
  const [specialistFilter, setSpecialistFilter] = React.useState('');
  const [serviceFilter, setServiceFilter] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [showNewDialog, setShowNewDialog] = React.useState(false);

  const totalPages = Math.ceil(total / LIMIT);
  const activeFilterCount = [specialistFilter, serviceFilter, statusFilter].filter(Boolean).length;

  const buildQuery = React.useCallback((forExport = false) => {
    const q = new URLSearchParams();
    if (!forExport) { q.set('page', String(page)); q.set('limit', String(LIMIT)); }
    else { q.set('limit', '1000'); }
    if (statusFilter) q.set('status', statusFilter);
    if (specialistFilter) q.set('specialistId', specialistFilter);
    const { from, to } = getDateRange(datePreset);
    if (from) q.set('from', from + 'T00:00:00.000Z');
    if (to) q.set('to', to + 'T23:59:59.999Z');
    return q;
  }, [page, statusFilter, specialistFilter, datePreset]);

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?${buildQuery()}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setBookings(json.data.items);
        setTotal(json.data.total);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [buildQuery]);

  React.useEffect(() => { fetchBookings(); }, [fetchBookings]);

  React.useEffect(() => {
    if (!showAnalytics) return;
    setAnalyticsLoading(true);
    fetch(`/api/admin/bookings?${buildAnalyticsQuery(analyticsPeriod)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setChartData(aggregateChartData(json.data.items as Booking[], analyticsPeriod, t));
      })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [showAnalytics, analyticsPeriod, t]);

  // Load filter options on mount
  React.useEffect(() => {
    Promise.all([
      fetch('/api/specialists?limit=100&status=ACTIVE', { credentials: 'include' }),
      fetch('/api/admin/services', { credentials: 'include' }),
    ]).then(([sr, svcR]) => Promise.all([sr.json(), svcR.json()])).then(([specJson, svcJson]) => {
      if (specJson.success) setAllSpecialists(specJson.data.items ?? []);
      if (svcJson.success) setAllServicesState(Array.isArray(svcJson.data) ? svcJson.data : []);
    }).catch(() => {});
  }, []);


  const updateBookingStatus = React.useCallback(async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
      }
    } catch { /* silent — list will refresh on next load */ }
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/bookings?${buildQuery(true)}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) return;

      const XLSX = await import('xlsx');
      const rows = (json.data.items as Booking[]).map((b) => ({
        [t('bookings.export.clientId')]: b.clientId,
        [t('bookings.export.client')]: b.clientName,
        [t('bookings.export.email')]: b.clientEmail,
        [t('bookings.export.specialist')]: b.specialistName,
        [t('bookings.export.seller')]: b.soldByName ?? '—',
        [t('bookings.export.service')]: b.services.map((s) => s.name).join(', '),
        [t('bookings.export.date')]: new Date(b.startAt).toLocaleDateString(locale),
        [t('bookings.export.time')]: new Date(b.startAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        [t('bookings.export.duration')]: b.totalDuration,
        [t('bookings.export.status')]: getAppointmentStatusLabel(b.status),
        [t('bookings.export.price')]: b.totalPrice,
        [t('bookings.export.location')]: b.locationName,
        [t('bookings.export.notes')]: b.notes ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [18, 22, 25, 22, 20, 28, 12, 8, 10, 15, 14, 20, 30].map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('bookings.export.sheet'));

      const date = new Date().toLocaleDateString(locale).replace(/\./g, '-');
      XLSX.writeFile(wb, `bookings-${date}.xlsx`);
    } catch {} finally { setExporting(false); }
  };

  const filterSpecialistLabel = specialistFilter
    ? allSpecialists.find((s) => s.id === specialistFilter)
      ? `${allSpecialists.find((s) => s.id === specialistFilter)!.firstName} ${allSpecialists.find((s) => s.id === specialistFilter)!.lastName}`
      : t('bookings.filter.specialist')
    : null;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('bookings.title')}</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {loading ? t('bookings.loading') : `${total.toLocaleString(locale)} ${t('bookings.pagination.records')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-colors',
              showAnalytics
                ? 'border-champagne/40 bg-champagne/5 text-champagne'
                : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            <BarChart2 className="w-4 h-4" />
            {t('bookings.analytics')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? t('bookings.exporting') : t('bookings.excel')}
          </button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNewDialog(true)}>
            {t('bookings.new')}
          </Button>
        </div>
      </div>

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="mb-6 bg-onyx border border-border-luxury rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-base font-medium text-text-primary">{t('bookings.analyticsTitle')}</h3>
            <div className="flex gap-1.5">
              {ANALYTICS_PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setAnalyticsPeriod(p.value)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs transition-colors',
                    analyticsPeriod === p.value
                      ? 'bg-champagne text-obsidian font-medium'
                      : 'bg-charcoal border border-border-luxury text-text-secondary hover:text-text-primary',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">{t('bookings.chartCount')}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-onyx)', border: '1px solid var(--color-border-luxury)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 }}
                      formatter={(v: number) => [v, t('bookings.count')]}
                    />
                    <Bar dataKey="bookings" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">{t('bookings.chartRevenue')}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}к` : String(v)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-onyx)', border: '1px solid var(--color-border-luxury)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 }}
                      formatter={(v: number) => [`${v.toLocaleString(locale)} ₽`, t('bookings.chartRevenue')]}
                    />
                    <Bar dataKey="revenue" fill="#A67C00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Date preset filter */}
      <div className="flex gap-2 flex-wrap mb-3">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => { setDatePreset(p.value); setPage(1); }}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
              datePreset === p.value
                ? 'bg-champagne text-obsidian font-medium'
                : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Status + Advanced Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={cn(
              'px-3 py-1 rounded-lg text-xs transition-colors',
              statusFilter === f.value
                ? 'bg-charcoal border border-champagne/40 text-champagne font-medium'
                : 'bg-onyx border border-border-luxury text-text-tertiary hover:text-text-secondary hover:bg-charcoal',
            )}
          >
            {f.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {(specialistFilter || serviceFilter) && (
            <button
              onClick={() => { setSpecialistFilter(''); setServiceFilter(''); setPage(1); }}
              className="text-xs text-text-tertiary hover:text-champagne transition-colors"
            >
              {t('bookings.filter.reset')}
            </button>
          )}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors border',
              showFilters || activeFilterCount > 0
                ? 'border-champagne/40 bg-champagne/5 text-champagne'
                : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {t('bookings.filter.filters')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-onyx border border-border-luxury rounded-2xl animate-fade-in">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{t('bookings.filter.specialist')}</p>
            <select
              value={specialistFilter}
              onChange={(e) => { setSpecialistFilter(e.target.value); setPage(1); }}
              className={cn(selectCls, 'py-2 text-sm')}
            >
              <option value="">{t('bookings.filter.allSpecialists')}</option>
              {allSpecialists.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{t('bookings.filter.procedure')}</p>
            <select
              value={serviceFilter}
              onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
              className={cn(selectCls, 'py-2 text-sm')}
            >
              <option value="">{t('bookings.filter.allProcedures')}</option>
              {allServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {(filterSpecialistLabel || serviceFilter) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {filterSpecialistLabel && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-champagne/10 border border-champagne/20 text-xs text-champagne">
              {filterSpecialistLabel}
              <button onClick={() => setSpecialistFilter('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {serviceFilter && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-champagne/10 border border-champagne/20 text-xs text-champagne">
              {allServices.find((s) => s.id === serviceFilter)?.name ?? t('bookings.filter.procedure')}
              <button onClick={() => setServiceFilter('')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <CalendarIcon className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">{t('bookings.empty')}</p>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNewDialog(true)}>
            {t('bookings.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.client')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.service')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.specialist')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.datetime')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.created')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.duration')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.status')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.amount')}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('bookings.col.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {bookings.map((b) => {
                  const canComplete = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status);
                  const canCancel   = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status);
                  const canProgress = b.status === 'CONFIRMED';
                  return (
                  <tr key={b.id} className="hover:bg-charcoal/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.clientName} size="sm" />
                        <div>
                          <span className="font-medium text-text-primary whitespace-nowrap">{b.clientName}</span>
                          <Link href={`/clients/${b.clientId}`} className="block text-[10px] text-champagne hover:underline">{b.clientId.substring(0, 8).toUpperCase()}</Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary max-w-[180px] truncate">{b.services[0]?.name ?? '—'}</td>
                    <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap">{b.specialistName}</td>
                    <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap tabular-nums">
                      <div>{new Date(b.startAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</div>
                      <div className="text-xs text-text-tertiary">{formatTime(new Date(b.startAt))}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                      <div className="text-xs text-text-tertiary">{new Date(b.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</div>
                      <div className="text-xs text-text-tertiary">{formatTime(new Date(b.createdAt))}</div>
                      {b.soldByName && <div className="text-[10px] text-champagne/70 truncate max-w-[100px]">{b.soldByName}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-text-tertiary whitespace-nowrap tabular-nums">{b.totalDuration} {t('common.min')}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={getAppointmentStatusBadgeVariant(b.status)} dot>
                        {getAppointmentStatusLabel(b.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                      {formatCurrency(b.totalPrice)}
                    </td>
                    <td className="px-4 py-3.5">
                      {(canComplete || canCancel || canProgress) && (
                        <div className="flex items-center gap-1">
                          {canProgress && (
                            <button
                              onClick={() => updateBookingStatus(b.id, 'IN_PROGRESS')}
                              title={t('bookings.action.inProgress')}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors whitespace-nowrap"
                            >{t('bookings.action.start')}</button>
                          )}
                          {canComplete && (
                            <button
                              onClick={() => updateBookingStatus(b.id, 'COMPLETED')}
                              title={t('bookings.action.completeTitle')}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors whitespace-nowrap"
                            >{t('bookings.action.complete')}</button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => updateBookingStatus(b.id, 'CANCELLED')}
                              title={t('bookings.action.cancelTitle')}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap"
                            >{t('bookings.action.cancel')}</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-border-luxury">
            {bookings.map((b) => (
              <div key={b.id} className="px-4 py-4 flex items-start gap-3">
                <Avatar name={b.clientName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary text-sm truncate">{b.clientName}</span>
                    <Badge variant={getAppointmentStatusBadgeVariant(b.status)}>
                      {getAppointmentStatusLabel(b.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{b.services[0]?.name ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-tertiary">{new Date(b.startAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-tertiary">{formatTime(new Date(b.startAt))}</span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary truncate">{b.specialistName}</span>
                    <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(b.totalPrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-text-tertiary">{t('bookings.pagination.page')} {page} {t('bookings.pagination.of')} {totalPages} · {total} {t('bookings.pagination.records')}</p>
          <div className="flex gap-2">
            {page > 1 && <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)}>{t('bookings.pagination.prev')}</Button>}
            {page < totalPages && <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>{t('bookings.pagination.next')}</Button>}
          </div>
        </div>
      )}

      <NewBookingDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={() => { setShowNewDialog(false); fetchBookings(); }}
      />
    </div>
  );
}
