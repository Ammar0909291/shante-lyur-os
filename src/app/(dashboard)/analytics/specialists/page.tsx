'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, BarChart2, Clock, Trophy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpecialistKPI {
  id:              string;
  name:            string;
  department:      string;
  color:           string | null;
  revenue:         number;
  visits:          number;
  completedVisits: number;
  uniqueClients:   number;
  avgTicket:       number;
  avgDuration:     number;
}

type SortKey = 'name' | 'revenue' | 'visits' | 'uniqueClients' | 'avgTicket' | 'completedVisits';

const PERIODS = [
  { value: '7d',  label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '3m',  label: '3 месяца' },
  { value: '6m',  label: '6 месяцев' },
  { value: '1y',  label: 'Год' },
];

const DEPT_LABEL: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE:     'Массаж',
  RECEPTION:   'Ресепшн',
  MANAGEMENT:  'Управление',
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="p-2.5 rounded-xl bg-champagne/10 text-champagne w-fit mb-3">{icon}</div>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Revenue bar ──────────────────────────────────────────────────────────────

function RevenueBar({ value, max, color }: { value: number; max: number; color: string | null }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-sm font-semibold text-text-primary tabular-nums w-24 text-right shrink-0">
        {fmtMoney(value)}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-charcoal overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color ?? '#d4af37' }}
        />
      </div>
    </div>
  );
}

// ─── Sortable header ──────────────────────────────────────────────────────────

function Th({ children, sortKey, current, dir, onSort }: {
  children: React.ReactNode;
  sortKey: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider cursor-pointer select-none hover:text-text-primary transition-colors whitespace-nowrap"
    >
      <span className={cn('inline-flex items-center gap-1', active && 'text-champagne')}>
        {children}
        <span className="opacity-50">{active ? (dir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </span>
    </th>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCsv(kpi: SpecialistKPI[], period: string) {
  const rows = [
    ['Специалист','Направление','Записей','Завершено','Клиентов','Выручка','Средний чек','Ср. длительность (мин)'],
    ...kpi.map((s) => [
      s.name, DEPT_LABEL[s.department] ?? s.department,
      s.visits, s.completedVisits, s.uniqueClients,
      s.revenue.toFixed(2), s.avgTicket.toFixed(2), s.avgDuration,
    ]),
  ];
  const csv = rows.map((r) => r.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `kpi_specialists_${period}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpecialistsKPIPage() {
  const [period, setPeriod]   = React.useState('30d');
  const [kpi,    setKpi]      = React.useState<SpecialistKPI[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sortKey, setSortKey] = React.useState<SortKey>('revenue');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/specialists/kpi?period=${period}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setKpi(j.data.kpi); })
      .finally(() => setLoading(false));
  }, [period]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const sorted = [...kpi].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const totalRevenue    = kpi.reduce((s, k) => s + k.revenue, 0);
  const totalVisits     = kpi.reduce((s, k) => s + k.visits, 0);
  const totalClients    = kpi.reduce((s, k) => s + k.uniqueClients, 0);
  const overallAvgTicket = kpi.length > 0 ? kpi.reduce((s, k) => s + k.avgTicket, 0) / kpi.filter((k) => k.completedVisits > 0).length || 0 : 0;
  const maxRevenue      = Math.max(1, ...kpi.map((k) => k.revenue));
  const leader          = kpi[0];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/analytics" className="text-text-tertiary hover:text-text-primary text-sm transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Аналитика
            </Link>
          </div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">KPI специалистов</h2>
          <p className="text-text-secondary mt-1 text-sm">Выручка, клиенты, средний чек по каждому сотруднику</p>
        </div>
        <button
          onClick={() => exportCsv(sorted, period)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40 transition-all"
        >
          <Download className="w-4 h-4" /> Экспорт CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
              period === p.value
                ? 'bg-champagne text-obsidian font-medium'
                : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SCard icon={<TrendingUp className="w-5 h-5" />} label="Общая выручка" value={fmtMoney(totalRevenue)} />
        <SCard icon={<BarChart2 className="w-5 h-5" />}  label="Всего записей"  value={fmtNum(totalVisits)} />
        <SCard icon={<Users className="w-5 h-5" />}      label="Уникальных клиентов" value={fmtNum(totalClients)} />
        <SCard icon={<Clock className="w-5 h-5" />}      label="Средний чек"    value={fmtMoney(isNaN(overallAvgTicket) ? 0 : overallAvgTicket)} />
      </div>

      {/* Leader */}
      {!loading && leader && leader.revenue > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-champagne/20 bg-champagne/5">
          <Trophy className="w-6 h-6 text-champagne shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Лидер по выручке — <span className="text-champagne">{leader.name}</span>
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {fmtMoney(leader.revenue)} · {leader.completedVisits} завершённых записей · {leader.uniqueClients} клиентов
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury bg-charcoal/50">
                <Th sortKey="name"           current={sortKey} dir={sortDir} onSort={handleSort}>Специалист</Th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Направление</th>
                <Th sortKey="visits"         current={sortKey} dir={sortDir} onSort={handleSort}>Записей</Th>
                <Th sortKey="completedVisits" current={sortKey} dir={sortDir} onSort={handleSort}>Завершено</Th>
                <Th sortKey="uniqueClients"  current={sortKey} dir={sortDir} onSort={handleSort}>Клиентов</Th>
                <Th sortKey="avgTicket"      current={sortKey} dir={sortDir} onSort={handleSort}>Средний чек</Th>
                <Th sortKey="revenue"        current={sortKey} dir={sortDir} onSort={handleSort}>Выручка</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-charcoal rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-tertiary">
                    Нет данных за выбранный период
                  </td>
                </tr>
              ) : (
                sorted.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-charcoal/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-obsidian shrink-0"
                          style={{ background: s.color ?? 'linear-gradient(135deg,#d4af37,#b8860b)' }}
                        >
                          {idx + 1}
                        </div>
                        <span className="font-medium text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                        s.department === 'COSMETOLOGY'
                          ? 'bg-purple-400/10 border-purple-400/30 text-purple-400'
                          : s.department === 'MASSAGE'
                          ? 'bg-green-400/10 border-green-400/30 text-green-400'
                          : 'bg-charcoal border-border-luxury text-text-secondary',
                      )}>
                        {DEPT_LABEL[s.department] ?? s.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-primary tabular-nums">{s.visits}</td>
                    <td className="px-4 py-3 text-text-primary tabular-nums">{s.completedVisits}</td>
                    <td className="px-4 py-3 text-text-primary tabular-nums">{s.uniqueClients}</td>
                    <td className="px-4 py-3 text-text-secondary tabular-nums">{fmtMoney(s.avgTicket)}</td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <RevenueBar value={s.revenue} max={maxRevenue} color={s.color} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-border-luxury text-xs text-text-tertiary">
            {sorted.length} специалистов
          </div>
        )}
      </div>
    </div>
  );
}
