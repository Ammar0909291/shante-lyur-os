'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Download, TrendingUp, Users, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientRole } from '@/lib/client-auth';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'revenue' | 'specialist' | 'customer';

interface RevenueReport {
  from: string; to: string; groupBy: string;
  totalRevenue: number; totalRefunds: number; netRevenue: number;
  transactionCount: number; avgTicket: number;
  byGroup: { key: string; label: string; revenue: number; bookings: number }[];
}

interface SpecialistReport {
  from: string; to: string;
  specialists: {
    specialistId: string; name: string; avatarUrl: string | null;
    totalBookings: number; completed: number; cancelled: number; noShows: number;
    revenue: number; avgTicket: number; commission: number; avgDuration: number; utilizationRate: number;
  }[];
}

interface CustomerReport {
  from: string; to: string;
  summary: {
    totalClients: number; newClients: number; returningClients: number; churnedClients: number;
    totalRevenue: number; avgRevenuePerClient: number; avgVisitsPerClient: number; retentionRate: number;
  };
  clients: {
    clientId: string; name: string; phone: string | null;
    visits: number; revenue: number; firstVisit: string; lastVisit: string; isNew: boolean;
  }[];
}

type ReportData = RevenueReport | SpecialistReport | CustomerReport;

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const REPORT_TYPES: { type: ReportType; label: string; desc: string; icon: React.ElementType }[] = [
  { type: 'revenue',    label: 'Выручка',              desc: 'Оборот, возвраты, средний чек по периодам',      icon: TrendingUp },
  { type: 'specialist', label: 'Специалисты',          desc: 'Записей, выручка, загруженность по мастерам',    icon: BarChart3  },
  { type: 'customer',   label: 'Клиенты',              desc: 'Новые vs возвратные, удержание, отток',          icon: Users      },
];

const GROUP_BY_OPTIONS = [
  { value: 'day',        label: 'По дням'       },
  { value: 'week',       label: 'По неделям'    },
  { value: 'month',      label: 'По месяцам'    },
  { value: 'specialist', label: 'По мастерам'   },
  { value: 'service',    label: 'По услугам'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const R = (n: number) => `₽${Math.round(n).toLocaleString('ru-RU')}`;
const N = (n: number) => n.toLocaleString('ru-RU');

function todayStr()        { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n + 1); return d.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ─── CSV builders ─────────────────────────────────────────────────────────────

function cell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function revenueCSV(data: RevenueReport): string {
  const header = ['Период', 'Выручка (₽)', 'Записей'];
  const rows   = data.byGroup.map((r) => [r.label, Math.round(r.revenue), r.bookings]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

function specialistCSV(data: SpecialistReport): string {
  const header = ['Мастер', 'Всего записей', 'Завершено', 'Отменено', 'Выручка (₽)', 'Средний чек (₽)', 'Комиссия (₽)', 'Загруженность %'];
  const rows   = data.specialists.map((s) => [
    s.name, s.totalBookings, s.completed, s.cancelled,
    Math.round(s.revenue), Math.round(s.avgTicket), Math.round(s.commission), s.utilizationRate,
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

function customerCSV(data: CustomerReport): string {
  const header = ['Клиент', 'Телефон', 'Посещений', 'Выручка (₽)', 'Тип', 'Первый визит', 'Последний визит'];
  const rows   = data.clients.map((c) => [
    c.name, c.phone ?? '', c.visits, Math.round(c.revenue),
    c.isNew ? 'Новый' : 'Возвратный',
    formatShortDate(c.firstVisit), formatShortDate(c.lastVisit),
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-charcoal border border-border-luxury rounded-xl p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Revenue results ──────────────────────────────────────────────────────────

function RevenueResults({ data }: { data: RevenueReport }) {
  const maxRev = Math.max(...data.byGroup.map((r) => r.revenue), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Выручка"      value={R(data.totalRevenue)}  />
        <KpiCard label="Возвраты"     value={R(data.totalRefunds)}  />
        <KpiCard label="Нетто"        value={R(data.netRevenue)}    />
        <KpiCard label="Транзакций"   value={N(data.transactionCount)} />
        <KpiCard label="Средний чек"  value={R(data.avgTicket)}     />
      </div>

      {data.byGroup.length > 0 && (
        <div className="bg-charcoal border border-border-luxury rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-obsidian/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Период / Группа</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Выручка</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Записей</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted pr-6">Доля</th>
              </tr>
            </thead>
            <tbody>
              {data.byGroup.map((row) => (
                <tr key={row.key} className="border-t border-border-luxury/40 hover:bg-charcoal/60">
                  <td className="px-4 py-3 text-text-primary font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-right text-champagne font-medium">{R(row.revenue)}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{N(row.bookings)}</td>
                  <td className="px-4 py-3 pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 bg-border-luxury rounded-full overflow-hidden">
                        <div
                          className="h-full bg-champagne/60 rounded-full"
                          style={{ width: `${Math.round((row.revenue / maxRev) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">
                        {Math.round((row.revenue / data.totalRevenue) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Specialist results ───────────────────────────────────────────────────────

function SpecialistResults({ data }: { data: SpecialistReport }) {
  return (
    <div className="space-y-4">
      <div className="bg-charcoal border border-border-luxury rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-obsidian/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Мастер</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Записей</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Заверш.</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Отмены</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Выручка</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Ср. чек</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Комиссия</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted pr-4">Загрузка</th>
            </tr>
          </thead>
          <tbody>
            {data.specialists.map((s) => (
              <tr key={s.specialistId} className="border-t border-border-luxury/40 hover:bg-charcoal/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-champagne/20 flex items-center justify-center text-xs font-semibold text-champagne shrink-0">
                      {s.avatarUrl
                        ? <img src={s.avatarUrl} className="w-full h-full object-cover rounded-full" alt={s.name} />
                        : initials(s.name)}
                    </div>
                    <span className="font-medium text-text-primary truncate">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{N(s.totalBookings)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{N(s.completed)}</td>
                <td className="px-4 py-3 text-right text-red-400">{N(s.cancelled)}</td>
                <td className="px-4 py-3 text-right text-champagne font-medium">{R(s.revenue)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{R(s.avgTicket)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{R(s.commission)}</td>
                <td className="px-4 py-3 pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-border-luxury rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.utilizationRate}%`,
                          background: s.utilizationRate >= 70 ? '#6EC99A' : s.utilizationRate >= 40 ? '#C9A96E' : '#C96E6E',
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-8 text-right">{s.utilizationRate}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {data.specialists.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">Нет данных</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Customer results ─────────────────────────────────────────────────────────

function CustomerResults({ data }: { data: CustomerReport }) {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Всего клиентов"  value={N(s.totalClients)} />
        <KpiCard label="Новые"           value={N(s.newClients)}   sub={`${s.totalClients ? Math.round((s.newClients / s.totalClients) * 100) : 0}% от всех`} />
        <KpiCard label="Возвратные"      value={N(s.returningClients)} sub={`Удержание ${s.retentionRate}%`} />
        <KpiCard label="Отток"           value={N(s.churnedClients)} sub="Не пришли в период" />
        <KpiCard label="Выручка"         value={R(s.totalRevenue)} />
        <KpiCard label="Ср. чек клиента" value={R(s.avgRevenuePerClient)} />
        <KpiCard label="Ср. визитов"     value={String(s.avgVisitsPerClient)} />
      </div>

      <div className="bg-charcoal border border-border-luxury rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-obsidian/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Клиент</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Статус</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Визитов</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Выручка</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Телефон</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted pr-4">Последний визит</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((c) => (
              <tr key={c.clientId} className="border-t border-border-luxury/40 hover:bg-charcoal/60">
                <td className="px-4 py-3 font-medium text-text-primary">{c.name}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                    c.isNew
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-champagne/12 text-champagne',
                  )}>
                    {c.isNew ? 'Новый' : 'Возвратный'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{c.visits}</td>
                <td className="px-4 py-3 text-right text-champagne font-medium">{R(c.revenue)}</td>
                <td className="px-4 py-3 text-right text-text-muted">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 pr-4 text-right text-text-muted">{formatShortDate(c.lastVisit)}</td>
              </tr>
            ))}
            {data.clients.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">Нет данных</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router  = useRouter();
  const role    = getClientRole();

  React.useEffect(() => {
    if (!REPORT_ROLES.includes(role)) router.replace('/dashboard');
  }, [role, router]);

  const [reportType, setReportType] = React.useState<ReportType>('revenue');
  const [from,       setFrom]       = React.useState(daysAgoStr(30));
  const [to,         setTo]         = React.useState(todayStr());
  const [groupBy,    setGroupBy]    = React.useState('day');

  const [data,    setData]    = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  if (!REPORT_ROLES.includes(role)) return null;

  async function generate() {
    setLoading(true);
    setData(null);
    try {
      const qs = new URLSearchParams({ from, to, ...(reportType === 'revenue' ? { groupBy } : {}) });
      const res  = await fetch(`/api/v1/reports/${reportType}?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Ошибка');
      setData(json.data as ReportData);
      setGenerated(true);
    } catch (e) {
      toast({ title: 'Ошибка формирования отчёта', description: e instanceof Error ? e.message : undefined, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!data) return;
    let csv = '';
    let filename = '';
    if (reportType === 'revenue') {
      csv = revenueCSV(data as RevenueReport);
      filename = `revenue-${from}-${to}.csv`;
    } else if (reportType === 'specialist') {
      csv = specialistCSV(data as SpecialistReport);
      filename = `specialists-${from}-${to}.csv`;
    } else {
      csv = customerCSV(data as CustomerReport);
      filename = `customers-${from}-${to}.csv`;
    }
    downloadCSV(csv, filename);
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Отчёты</h1>
            <p className="text-sm text-text-muted mt-0.5">Формируйте отчёты по выбранному периоду</p>
          </div>
          {data && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-charcoal border border-border-luxury hover:border-border-light text-text-secondary hover:text-text-primary transition-all"
            >
              <Download className="w-4 h-4" />
              Скачать CSV
            </button>
          )}
        </div>

        {/* Report type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REPORT_TYPES.map(({ type, label, desc, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => { setReportType(type); setData(null); setGenerated(false); }}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                reportType === type
                  ? 'bg-champagne/8 border-champagne/40 shadow-champagne-sm'
                  : 'bg-charcoal border-border-luxury hover:border-border-light',
              )}
            >
              <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', reportType === type ? 'text-champagne' : 'text-text-muted')} />
              <div>
                <p className={cn('font-medium text-sm', reportType === type ? 'text-champagne' : 'text-text-primary')}>{label}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">С даты</label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-obsidian border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">По дату</label>
              <input
                type="date"
                value={to}
                min={from}
                max={todayStr()}
                onChange={(e) => setTo(e.target.value)}
                className="bg-obsidian border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/60"
              />
            </div>

            {reportType === 'revenue' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-muted">Группировка</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="bg-obsidian border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/60"
                >
                  {GROUP_BY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                'bg-champagne-gradient text-obsidian shadow-champagne-sm',
                'hover:shadow-champagne hover:scale-[1.02] active:scale-[0.98]',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100',
              )}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              {loading ? 'Формирую…' : generated ? 'Обновить' : 'Сформировать'}
            </button>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-champagne/40 border-t-champagne rounded-full animate-spin" />
              <p className="text-sm text-text-muted">Формирую отчёт…</p>
            </div>
          </div>
        )}

        {!loading && data && reportType === 'revenue' && (
          <RevenueResults data={data as RevenueReport} />
        )}
        {!loading && data && reportType === 'specialist' && (
          <SpecialistResults data={data as SpecialistReport} />
        )}
        {!loading && data && reportType === 'customer' && (
          <CustomerResults data={data as CustomerReport} />
        )}

        {!loading && !data && !generated && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-primary font-medium">Выберите тип отчёта и период</p>
            <p className="text-xs text-text-muted mt-1">Нажмите «Сформировать» чтобы получить данные</p>
          </div>
        )}
      </div>
    </div>
  );
}
