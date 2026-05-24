'use client';

import * as React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadialBarChart, RadialBar, Cell, Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Shield, AlertTriangle, Users,
  BarChart2, Download, RefreshCw, Zap, Star, AlertCircle,
  CheckCircle2, Activity, Target, Clock, ArrowUpRight,
  ArrowDownLeft, ChevronRight, Minus,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useChartTheme } from '@/lib/use-chart-theme';
import { authHeaders } from '@/lib/client-auth';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Period = 7 | 30 | 90 | 180 | 365;
type TabId  = 'overview' | 'forecast' | 'risks' | 'retention' | 'specialists' | 'profitability';

interface Intelligence {
  period: { days: number; from: string; to: string };
  health: { score: number; grade: string; components: Record<string, number> };
  revenue: { total: number; net: number; profit: number; expenses: number; refunds: number; avgDaily: number; trend: number; prev: number; projectedMonth: number; consumableCost: number };
  bookings: { total: number; completed: number; cancelled: number; occupancyRate: number; cancelRate: number };
  clients: { activeInPeriod: number; returning: number; new: number; atRisk: number; vip: number; retentionRate: number };
  specialists: SpecialistStat[];
  services: { top: ServiceStat[]; low: ServiceStat[]; all: ServiceStat[] };
  dailySeries: { date: string; revenue: number }[];
  risks: Risk[];
  briefing: Briefing;
}

interface SpecialistStat {
  id: string; name: string; totalApts: number; completedApts: number;
  revenue: number; avgCheck: number; completionRate: number; cancelRate: number;
  retentionRate: number; efficiency: number; utilization: number; clientCount: number;
  burnoutRisk: string; insight: string;
}

interface ServiceStat {
  id: string; name: string; category: string; revenue: number; count: number; avgPrice: number;
}

interface Risk {
  id: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; category: string; code: string; message: string; detail: string; metric?: number;
}

interface Briefing {
  todayRevenue: number; expectedRevenue: number; todayBookings: number; completedToday: number;
  occupancyRate: number; cancellationsToday: number; lowStockAlerts: number;
  topSpecialist: string | null; riskCount: number; retentionRate: number;
}

interface ForecastData {
  historicalDays: { date: string; revenue: number }[];
  forecast: { date: string; forecastRevenue: number; low: number; high: number; confidence: string }[];
  trend: 'up' | 'down' | 'stable';
  confidence: string;
  projectedThisMonth: number;
  projectedNext30Days: number;
  dowDemand: { dow: number; name: string; avgRevenue: number; relativeLoad: number; isHigh: boolean; isLow: boolean }[];
  summary: { avgDailyRevenue: number; busiestDay: string; slowestDay: string };
}

interface RetentionData {
  summary: { totalActiveClients: number; returningClients: number; newClients: number; atRiskClients: number; vipClients: number; overallRetentionRate: number };
  segments: {
    vips: { id: string; name: string; visits: number; totalSpent: number; lastVisit: string; returnProbability: number }[];
    atRisk: { id: string; name: string; daysSince: number; returnProbability: number; totalSpent: number }[];
    newClients: { id: string; name: string; firstVisit: string; visits: number }[];
  };
  retentionTrend: { month: string; total: number; returning: number; new: number; rate: number }[];
}

interface RisksData {
  summary: { total: number; high: number; medium: number; low: number };
  risks: Risk[];
  context: { cancelRate7d: number; occupancy30d: number; refundRate30d: number; revenueTrend: number; atRiskClients: number; inventoryAlerts: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────


const CHART_COLORS = { champagne: '#C9A96E', sage: '#7C9A7E', red: '#EF4444', amber: '#F59E0B', blue: '#60A5FA', purple: '#A78BFA' };

const HEALTH_COLORS: Record<string, string> = {
  EXCELLENT:     'text-emerald-400', STABLE: 'text-champagne',
  RISK_DETECTED: 'text-amber-400',   CRITICAL: 'text-red-500',
};
const HEALTH_BG: Record<string, string> = {
  EXCELLENT:     'border-emerald-400/30 bg-emerald-400/5',
  STABLE:        'border-champagne/30 bg-champagne/5',
  RISK_DETECTED: 'border-amber-400/30 bg-amber-400/5',
  CRITICAL:      'border-red-500/30 bg-red-500/5',
};
const HEALTH_LABELS: Record<string, string> = {
  EXCELLENT: 'Отлично', STABLE: 'Стабильно', RISK_DETECTED: 'Риск обнаружен', CRITICAL: 'Критично',
};
const INSIGHT_LABELS: Record<string, { label: string; color: string }> = {
  HIGH_PERFORMER: { label: 'Высокая эффективность', color: 'text-emerald-400' },
  HIGH_RETENTION: { label: 'Удерживает клиентов',   color: 'text-blue-400' },
  OVERLOADED:     { label: 'Перегрузка',             color: 'text-red-400' },
  LOW_CONVERSION: { label: 'Низкая конверсия',       color: 'text-amber-400' },
  NORMAL:         { label: 'Норма',                  color: 'text-text-tertiary' },
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, icon: Icon }: {
  label: string; value: string; sub?: string; trend?: number; icon?: React.ElementType;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{label}</p>
        {Icon && <div className="w-8 h-8 rounded-lg luxury-gradient flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-obsidian" /></div>}
      </div>
      <p className="font-serif text-2xl font-medium text-text-primary tabular-nums">{value}</p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
      {trend !== undefined && trend !== 0 && (
        <div className={cn('flex items-center gap-1', trend > 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
          <span className="text-xs font-semibold">{trend > 0 ? '+' : ''}{trend}%</span>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = { HIGH: 'bg-red-900/30 text-red-400 border-red-900/40', MEDIUM: 'bg-amber-900/30 text-amber-400 border-amber-900/40', LOW: 'bg-blue-900/30 text-blue-400 border-blue-900/40' };
  const labels: Record<string, string> = { HIGH: 'ВЫСОКИЙ', MEDIUM: 'СРЕДНИЙ', LOW: 'НИЗКИЙ' };
  return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', map[severity])}>{labels[severity]}</span>;
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-onyx border border-border-luxury rounded-2xl overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-border-luxury">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { v: Period; label: string }[] = [
    { v: 7, label: '7 дней' }, { v: 30, label: '30 дней' }, { v: 90, label: '90 дней' },
    { v: 180, label: '6 мес' }, { v: 365, label: '1 год' },
  ];
  return (
    <div className="flex gap-1 bg-obsidian/60 p-1 rounded-xl border border-border-luxury">
      {opts.map(({ v, label }) => (
        <button key={v} onClick={() => onChange(v)}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            value === v ? 'luxury-gradient text-obsidian' : 'text-text-tertiary hover:text-text-primary')}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Health Score Gauge ───────────────────────────────────────────────────────
function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const data = [{ value: score, fill: CHART_COLORS.champagne }, { value: 100 - score, fill: 'transparent' }];
  return (
    <div className={cn('rounded-2xl border p-6 flex flex-col items-center gap-3', HEALTH_BG[grade] ?? 'border-border-luxury')}>
      <div className="relative w-36 h-20 flex items-center justify-center">
        <RadialBarChart width={144} height={80} innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={6} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={cn('text-3xl font-bold font-serif', HEALTH_COLORS[grade])}>{score}</span>
        </div>
      </div>
      <div className="text-center">
        <div className={cn('text-lg font-bold font-serif', HEALTH_COLORS[grade])}>{HEALTH_LABELS[grade] ?? grade}</div>
        <div className="text-xs text-text-tertiary mt-0.5">Индекс здоровья бизнеса</div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const chart = useChartTheme();
  const [tab, setTab]       = React.useState<TabId>('overview');
  const [period, setPeriod] = React.useState<Period>(30);

  const [intel, setIntel]   = React.useState<Intelligence | null>(null);
  const [forecast, setForecast] = React.useState<ForecastData | null>(null);
  const [retention, setRetention] = React.useState<RetentionData | null>(null);
  const [risks, setRisks]   = React.useState<RisksData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fLoading, setFLoading] = React.useState(false);
  const [rLoading, setRLoading] = React.useState(false);
  const [retLoading, setRetLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  async function fetchIntel(p: Period) {
    setLoading(true);
    try {
      const res = await fetch(`/api/executive/intelligence?period=${p}`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: Intelligence };
      if (json.success && json.data) setIntel(json.data);
    } finally { setLoading(false); }
  }

  async function fetchForecast() {
    setFLoading(true);
    try {
      const res = await fetch('/api/executive/forecast?horizon=30', { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: ForecastData };
      if (json.success && json.data) setForecast(json.data);
    } finally { setFLoading(false); }
  }

  async function fetchRetention() {
    setRetLoading(true);
    try {
      const res = await fetch(`/api/executive/retention?period=${period}`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: RetentionData };
      if (json.success && json.data) setRetention(json.data);
    } finally { setRetLoading(false); }
  }

  async function fetchRisks() {
    setRLoading(true);
    try {
      const res = await fetch('/api/executive/risks', { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: RisksData };
      if (json.success && json.data) setRisks(json.data);
    } finally { setRLoading(false); }
  }

  async function doExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/executive/export?period=${period}`, { headers: authHeaders() });
      if (!res.ok) { alert('Ошибка экспорта'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `executive_report_${period}d.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  React.useEffect(() => { fetchIntel(period); }, [period]);
  React.useEffect(() => { if (tab === 'forecast') fetchForecast(); }, [tab]);
  React.useEffect(() => { if (tab === 'retention') fetchRetention(); }, [tab, period]);
  React.useEffect(() => { if (tab === 'risks') fetchRisks(); }, [tab]);

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview',      label: 'Обзор',           icon: BarChart2 },
    { id: 'forecast',      label: 'Прогноз',          icon: TrendingUp },
    { id: 'risks',         label: 'Риски',            icon: Shield },
    { id: 'retention',     label: 'Удержание',        icon: Users },
    { id: 'specialists',   label: 'Специалисты',      icon: Star },
    { id: 'profitability', label: 'Прибыльность',     icon: Target },
  ];

  const Spinner = () => (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="w-8 h-8 text-champagne animate-spin" />
    </div>
  );

  // ─── Derived state ──────────────────────────────────────────────────────────
  const d = intel;
  const highRiskCount = d?.risks.filter(r => r.severity === 'HIGH').length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-serif">Исполнительная аналитика</h1>
          <p className="text-sm text-text-tertiary mt-0.5">CEO / Директор · Принятие стратегических решений</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button onClick={() => fetchIntel(period)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-luxury text-text-tertiary text-sm hover:bg-charcoal transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={doExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 rounded-lg luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50">
            <Download className="w-4 h-4" />
            {exporting ? 'Формирование...' : 'Экспорт .xlsx'}
          </button>
        </div>
      </div>

      {/* Alert banner for high risks */}
      {highRiskCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-900/20 border border-red-900/40">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{highRiskCount} критических риска требуют немедленного внимания</span>
          <button onClick={() => setTab('risks')} className="ml-auto text-xs text-red-400 flex items-center gap-1 hover:text-red-300">
            Просмотреть <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian/60 p-1 rounded-xl border border-border-luxury w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'luxury-gradient text-obsidian shadow-sm' : 'text-text-tertiary hover:text-text-primary hover:bg-charcoal')}>
            <Icon className="w-4 h-4" />
            {label}
            {id === 'risks' && highRiskCount > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{highRiskCount}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        loading ? <Spinner /> : d ? (
          <div className="space-y-6">
            {/* Row 1: Health + Briefing */}
            <div className="grid lg:grid-cols-4 gap-5">
              <HealthGauge score={d.health.score} grade={d.health.grade} />
              <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard label="Выручка" value={formatCurrency(d.revenue.total)} trend={d.revenue.trend} icon={TrendingUp} sub={`Нетто: ${formatCurrency(d.revenue.net)}`} />
                <KpiCard label="Прибыль" value={formatCurrency(d.revenue.profit)} icon={Target} sub={`Расходы: ${formatCurrency(d.revenue.expenses)}`} trend={d.revenue.profit > 0 ? 1 : -1} />
                <KpiCard label="Загруженность" value={`${d.bookings.occupancyRate}%`} icon={Activity} sub={`${d.bookings.completed}/${d.bookings.total} записей`} />
                <KpiCard label="Прогноз / мес." value={formatCurrency(d.revenue.projectedMonth)} icon={BarChart2} sub={`Ср./день: ${formatCurrency(d.revenue.avgDaily)}`} />
                <KpiCard label="Удержание" value={`${d.clients.retentionRate}%`} icon={Users} sub={`${d.clients.returning} повторных · ${d.clients.vip} VIP`} />
                <KpiCard label="Отмены" value={`${d.bookings.cancelRate}%`} icon={AlertCircle} sub={`${d.bookings.cancelled} из ${d.bookings.total}`} trend={d.bookings.cancelRate > 15 ? -1 : 0} />
              </div>
            </div>

            {/* Health components */}
            <SectionCard title="Компоненты здоровья бизнеса">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(d.health.components).map(([key, val]) => {
                  const labels: Record<string, string> = { revenue: 'Выручка', retention: 'Удержание', occupancy: 'Загруженность', cancellation: 'Контроль отмен', financial: 'Финансы' };
                  const maxes: Record<string, number>  = { revenue: 25, retention: 20, occupancy: 20, cancellation: 15, financial: 20 };
                  const pctVal = maxes[key] ? Math.round(val / maxes[key] * 100) : 0;
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-tertiary">{labels[key] ?? key}</span>
                        <span className="text-text-primary font-semibold">{val}/{maxes[key] ?? 0}</span>
                      </div>
                      <div className="h-2 bg-charcoal rounded-full overflow-hidden">
                        <div className="h-full luxury-gradient rounded-full transition-all" style={{ width: `${pctVal}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Revenue chart */}
            <SectionCard title={`Динамика выручки за ${d.period.days} дней`}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.dailySeries} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.champagne} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.champagne} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8A8A9A' }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#8A8A9A' }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}к`} />
                  <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Выручка']} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.champagne} strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Briefing + top risks */}
            <div className="grid lg:grid-cols-2 gap-5">
              <SectionCard title="Ежедневный брифинг">
                <div className="space-y-3">
                  {[
                    { label: 'Выручка сегодня', value: formatCurrency(d.briefing.todayRevenue), sub: `Ожидалось: ${formatCurrency(d.briefing.expectedRevenue)}`, ok: d.briefing.todayRevenue >= d.briefing.expectedRevenue * 0.8 },
                    { label: 'Записей сегодня', value: String(d.briefing.todayBookings), sub: `Завершено: ${d.briefing.completedToday}`, ok: true },
                    { label: 'Загруженность', value: `${d.briefing.occupancyRate}%`, sub: '', ok: d.briefing.occupancyRate >= 60 },
                    { label: 'Отмены сегодня', value: String(d.briefing.cancellationsToday), sub: '', ok: d.briefing.cancellationsToday === 0 },
                    { label: 'Нехватка запасов', value: String(d.briefing.lowStockAlerts), sub: 'позиций ниже минимума', ok: d.briefing.lowStockAlerts === 0 },
                    { label: 'Удержание клиентов', value: `${d.briefing.retentionRate}%`, sub: 'за период', ok: d.briefing.retentionRate >= 40 },
                  ].map(({ label, value, sub, ok }) => (
                    <div key={label} className="flex items-center justify-between border-b border-border-luxury/30 pb-2">
                      <div className="flex items-center gap-2">
                        {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                        <div>
                          <div className="text-sm text-text-primary">{label}</div>
                          {sub && <div className="text-xs text-text-tertiary">{sub}</div>}
                        </div>
                      </div>
                      <span className={cn('text-sm font-bold', ok ? 'text-text-primary' : 'text-amber-400')}>{value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Топ-3 риска">
                {d.risks.slice(0, 5).length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm py-4">
                    <CheckCircle2 className="w-5 h-5" /> Операционные риски не обнаружены
                  </div>
                ) : (
                  <div className="space-y-3">
                    {d.risks.slice(0, 5).map(risk => (
                      <div key={risk.id} className="flex items-start gap-3 border-b border-border-luxury/30 pb-3">
                        <RiskBadge severity={risk.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text-primary font-medium">{risk.message}</div>
                          <div className="text-xs text-text-tertiary mt-0.5 truncate">{risk.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Top services */}
            <div className="grid lg:grid-cols-2 gap-5">
              <SectionCard title="Услуги по выручке">
                <div className="space-y-2">
                  {d.services.top.map((svc, i) => (
                    <div key={svc.id} className="flex items-center gap-3 border-b border-border-luxury/30 pb-2">
                      <span className="text-xs text-text-tertiary w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm text-text-primary">{svc.name}</div>
                        <div className="text-xs text-text-tertiary">{svc.count} сеансов · ср. {formatCurrency(svc.avgPrice)}</div>
                      </div>
                      <span className="text-sm font-bold text-champagne">{formatCurrency(svc.revenue)}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Клиентский сегмент">
                <div className="space-y-3">
                  {[
                    { label: 'Активные клиенты', value: d.clients.activeInPeriod, color: 'text-text-primary' },
                    { label: 'VIP клиенты', value: d.clients.vip, color: 'text-champagne' },
                    { label: 'Новые клиенты', value: d.clients.new, color: 'text-emerald-400' },
                    { label: 'Вернувшиеся', value: d.clients.returning, color: 'text-blue-400' },
                    { label: 'Под риском оттока', value: d.clients.atRisk, color: 'text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between border-b border-border-luxury/30 pb-2">
                      <span className="text-sm text-text-secondary">{label}</span>
                      <span className={cn('text-sm font-bold', color)}>{value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        ) : null
      )}

      {/* ── FORECAST TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'forecast' && (
        fLoading ? <Spinner /> : forecast ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Ср. выручка/день" value={formatCurrency(forecast.summary.avgDailyRevenue)} icon={BarChart2} />
              <KpiCard label="Прогноз 30 дней" value={formatCurrency(forecast.projectedNext30Days)} icon={TrendingUp} sub={`Уверенность: ${forecast.confidence}`} />
              <KpiCard label="Самый загруж. день" value={forecast.summary.busiestDay} icon={Activity} />
              <KpiCard label="Тренд" value={forecast.trend === 'up' ? '↑ Рост' : forecast.trend === 'down' ? '↓ Снижение' : '→ Стабильно'} icon={forecast.trend === 'up' ? TrendingUp : forecast.trend === 'down' ? TrendingDown : Minus} />
            </div>

            {/* Forecast chart */}
            <SectionCard title="Прогноз выручки на 30 дней">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.champagne} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.champagne} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.sage} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.sage} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8A8A9A' }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#8A8A9A' }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}к`} />
                  <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                  {/* Historical */}
                  <Area type="monotone" data={forecast.historicalDays} dataKey="revenue" stroke={CHART_COLORS.champagne} strokeWidth={2} fill="url(#histGrad)" name="История" />
                  {/* Forecast upper bound */}
                  <Area type="monotone" data={forecast.forecast} dataKey="high" stroke="transparent" fill={CHART_COLORS.sage} fillOpacity={0.08} name="" />
                  <Area type="monotone" data={forecast.forecast} dataKey="forecastRevenue" stroke={CHART_COLORS.sage} strokeWidth={2} strokeDasharray="6 3" fill="url(#foreGrad)" name="Прогноз" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* DOW demand */}
            <SectionCard title="Спрос по дням недели">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecast.dowDemand} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A8A9A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8A8A9A' }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}к`} />
                  <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Ср. выручка']} />
                  <Bar dataKey="avgRevenue" radius={[4, 4, 0, 0]}>
                    {forecast.dowDemand.map((entry, i) => (
                      <Cell key={i} fill={entry.isHigh ? CHART_COLORS.champagne : entry.isLow ? '#3A3A48' : '#5A5A6A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 text-xs text-text-tertiary">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: CHART_COLORS.champagne }} />Пиковый спрос</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-charcoal" />Низкий спрос</span>
              </div>
            </SectionCard>
          </div>
        ) : <div className="flex items-center justify-center h-40 text-text-tertiary text-sm">Нет данных</div>
      )}

      {/* ── RISKS TAB ─────────────────────────────────────────────────────────────── */}
      {tab === 'risks' && (
        rLoading ? <Spinner /> : risks ? (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-red-400 font-serif">{risks.summary.high}</div>
                <div className="text-xs text-red-400/70 uppercase tracking-wider mt-1">Критических</div>
              </div>
              <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-400 font-serif">{risks.summary.medium}</div>
                <div className="text-xs text-amber-400/70 uppercase tracking-wider mt-1">Средних</div>
              </div>
              <div className="bg-blue-900/10 border border-blue-900/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400 font-serif">{risks.summary.low}</div>
                <div className="text-xs text-blue-400/70 uppercase tracking-wider mt-1">Низких</div>
              </div>
            </div>

            {/* Context metrics */}
            <SectionCard title="Метрики рисков">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Отмены (7 дней)', value: `${risks.context.cancelRate7d}%`, warn: risks.context.cancelRate7d > 20 },
                  { label: 'Загруженность (30 дн.)', value: `${risks.context.occupancy30d}%`, warn: risks.context.occupancy30d < 60 },
                  { label: 'Возвраты (30 дн.)', value: `${risks.context.refundRate30d}%`, warn: risks.context.refundRate30d > 5 },
                  { label: 'Тренд выручки', value: `${risks.context.revenueTrend > 0 ? '+' : ''}${risks.context.revenueTrend}%`, warn: risks.context.revenueTrend < -10 },
                  { label: 'Клиенты под риском', value: String(risks.context.atRiskClients), warn: risks.context.atRiskClients > 5 },
                  { label: 'Запасы ниже мин.', value: String(risks.context.inventoryAlerts), warn: risks.context.inventoryAlerts > 0 },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="flex justify-between items-center border-b border-border-luxury/30 pb-3">
                    <span className="text-sm text-text-secondary">{label}</span>
                    <span className={cn('text-sm font-bold', warn ? 'text-amber-400' : 'text-text-primary')}>{value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Risk list */}
            <SectionCard title={`Все риски (${risks.summary.total})`}>
              {risks.risks.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm py-4">
                  <CheckCircle2 className="w-5 h-5" /> Критических рисков не обнаружено
                </div>
              ) : (
                <div className="space-y-3">
                  {risks.risks.map(risk => (
                    <div key={risk.id} className="flex items-start gap-4 p-3 rounded-xl bg-charcoal/40 border border-border-luxury/40">
                      <RiskBadge severity={risk.severity} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-tertiary uppercase tracking-wider">{risk.category}</span>
                        </div>
                        <div className="text-sm font-medium text-text-primary mt-0.5">{risk.message}</div>
                        <div className="text-xs text-text-tertiary mt-0.5">{risk.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        ) : null
      )}

      {/* ── RETENTION TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'retention' && (
        retLoading ? <Spinner /> : retention ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="Удержание" value={`${retention.summary.overallRetentionRate}%`} icon={Users} sub={`${retention.summary.returningClients} из ${retention.summary.totalActiveClients}`} />
              <KpiCard label="VIP клиентов" value={String(retention.summary.vipClients)} icon={Star} sub="3+ визита · высокий чек" />
              <KpiCard label="Под риском оттока" value={String(retention.summary.atRiskClients)} icon={AlertTriangle} sub="Не вернулись в период" />
            </div>

            {/* Retention trend */}
            {retention.retentionTrend.length > 0 && (
              <SectionCard title="Тренд удержания по месяцам">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={retention.retentionTrend} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8A8A9A' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#8A8A9A' }} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [`${v}%`, 'Удержание']} />
                    <Line type="monotone" dataKey="rate" stroke={CHART_COLORS.champagne} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.champagne }} />
                    <ReferenceLine y={50} stroke={CHART_COLORS.red} strokeDasharray="4 4" label={{ value: '50%', fill: '#EF4444', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>
            )}

            <div className="grid lg:grid-cols-2 gap-5">
              {/* VIPs */}
              <SectionCard title={`VIP клиенты (${retention.segments.vips.length})`}>
                {retention.segments.vips.length === 0 ? (
                  <p className="text-text-tertiary text-sm">Нет VIP клиентов за период</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {retention.segments.vips.map(client => (
                      <div key={client.id} className="flex items-center justify-between border-b border-border-luxury/30 pb-2">
                        <div>
                          <div className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                            <Star className="w-3 h-3 text-champagne" /> {client.name}
                          </div>
                          <div className="text-xs text-text-tertiary">{client.visits} визита · посл. {client.lastVisit}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-champagne">{formatCurrency(client.totalSpent)}</div>
                          <div className="text-xs text-emerald-400">{client.returnProbability}% вернётся</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* At risk */}
              <SectionCard title={`Риск оттока (${retention.segments.atRisk.length})`}>
                {retention.segments.atRisk.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Отток клиентов не обнаружен</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {retention.segments.atRisk.map(client => (
                      <div key={client.id} className="flex items-center justify-between border-b border-border-luxury/30 pb-2">
                        <div>
                          <div className="text-sm text-text-primary">{client.name}</div>
                          <div className="text-xs text-text-tertiary">Последний визит {client.daysSince} дней назад</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-amber-400">{client.returnProbability}% вернётся</div>
                          <div className="text-xs text-text-tertiary">{formatCurrency(client.totalSpent)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        ) : null
      )}

      {/* ── SPECIALISTS TAB ────────────────────────────────────────────────────────── */}
      {tab === 'specialists' && (
        loading ? <Spinner /> : d && d.specialists.length > 0 ? (
          <div className="space-y-5">
            {/* Efficiency ranking chart */}
            <SectionCard title="Рейтинг эффективности специалистов">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={d.specialists.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 40, bottom: 0, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#8A8A9A' }} domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#C9A96E' }} width={75} />
                  <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [`${v}%`, 'Эффективность']} />
                  <Bar dataKey="efficiency" radius={[0, 4, 4, 0]}>
                    {d.specialists.slice(0, 8).map((entry, i) => (
                      <Cell key={i} fill={entry.efficiency >= 70 ? CHART_COLORS.champagne : entry.efficiency >= 50 ? CHART_COLORS.sage : '#5A5A6A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Detail cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {d.specialists.map(spec => {
                const insight = INSIGHT_LABELS[spec.insight] ?? { label: 'Норма', color: 'text-text-tertiary' };
                return (
                  <div key={spec.id} className="bg-onyx border border-border-luxury rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{spec.name}</div>
                        <div className={cn('text-xs font-medium mt-0.5', insight.color)}>{insight.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-champagne font-serif">{spec.efficiency}%</div>
                        <div className="text-[10px] text-text-tertiary">эффективность</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
                      <div className="h-full luxury-gradient rounded-full" style={{ width: `${spec.efficiency}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-text-tertiary">Завершено: <span className="text-text-primary font-medium">{spec.completedApts}</span></div>
                      <div className="text-text-tertiary">Выручка: <span className="text-champagne font-medium">{formatCurrency(spec.revenue)}</span></div>
                      <div className="text-text-tertiary">Ср. чек: <span className="text-text-primary">{formatCurrency(spec.avgCheck)}</span></div>
                      <div className="text-text-tertiary">Удержание: <span className="text-text-primary">{spec.retentionRate}%</span></div>
                      <div className="text-text-tertiary">Отмены: <span className={cn(spec.cancelRate > 15 ? 'text-red-400' : 'text-text-primary')}>{spec.cancelRate}%</span></div>
                      <div className="text-text-tertiary">Клиентов: <span className="text-text-primary">{spec.clientCount}</span></div>
                    </div>
                    {spec.burnoutRisk !== 'LOW' && (
                      <div className={cn('text-xs px-2 py-1 rounded-lg flex items-center gap-1.5',
                        spec.burnoutRisk === 'HIGH' ? 'bg-red-900/20 text-red-400' : 'bg-amber-900/20 text-amber-400')}>
                        <Zap className="w-3 h-3" />
                        {spec.burnoutRisk === 'HIGH' ? 'Риск выгорания — критическая нагрузка' : 'Повышенная нагрузка'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : loading ? <Spinner /> : <div className="flex items-center justify-center h-40 text-text-tertiary text-sm">Нет данных</div>
      )}

      {/* ── PROFITABILITY TAB ──────────────────────────────────────────────────────── */}
      {tab === 'profitability' && (
        loading ? <Spinner /> : d ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Чистая выручка" value={formatCurrency(d.revenue.net)} icon={TrendingUp} />
              <KpiCard label="Себест-ть (склад)" value={formatCurrency(d.revenue.consumableCost)} icon={Clock} sub="Расходные материалы" />
              <KpiCard label="Операц. расходы" value={formatCurrency(d.revenue.expenses)} icon={AlertCircle} />
              <KpiCard label="Чистая прибыль" value={formatCurrency(d.revenue.profit)} icon={Target} trend={d.revenue.profit > 0 ? 1 : -1} />
            </div>

            {/* P&L bar chart */}
            <SectionCard title="Структура прибыли и убытков">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[{
                    name: 'P&L',
                    Выручка:    d.revenue.total,
                    Возвраты:   d.revenue.refunds,
                    Расходники: d.revenue.consumableCost,
                    Расходы:    d.revenue.expenses,
                    Прибыль:    Math.max(0, d.revenue.profit),
                  }]}
                  margin={{ top: 5, right: 10, bottom: 0, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A8A9A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8A8A9A' }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}к`} />
                  <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                  <Legend />
                  <Bar dataKey="Выручка"    fill={CHART_COLORS.champagne} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Возвраты"   fill={CHART_COLORS.red}       radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Расходники" fill={CHART_COLORS.amber}     radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Расходы"    fill={CHART_COLORS.purple}    radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Прибыль"    fill={CHART_COLORS.sage}      radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Top profitable services */}
              <SectionCard title="Наиболее прибыльные услуги">
                <div className="space-y-2">
                  {d.services.top.slice(0, 6).map((svc, i) => (
                    <div key={svc.id} className="flex items-center gap-3 border-b border-border-luxury/30 pb-2">
                      <span className="w-5 h-5 rounded-full luxury-gradient flex items-center justify-center text-obsidian text-xs font-bold shrink-0">{i+1}</span>
                      <div className="flex-1">
                        <div className="text-sm text-text-primary">{svc.name}</div>
                        <div className="text-xs text-text-tertiary">{svc.count} сеансов</div>
                      </div>
                      <span className="text-sm font-bold text-champagne">{formatCurrency(svc.revenue)}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Specialist profitability */}
              <SectionCard title="Прибыльность специалистов">
                <div className="space-y-2">
                  {d.specialists.slice(0, 6).map(spec => (
                    <div key={spec.id} className="flex items-center justify-between border-b border-border-luxury/30 pb-2">
                      <div>
                        <div className="text-sm text-text-primary">{spec.name}</div>
                        <div className="text-xs text-text-tertiary">{spec.completedApts} проц. · ср. {formatCurrency(spec.avgCheck)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-champagne">{formatCurrency(spec.revenue)}</div>
                        <div className={cn('text-xs', spec.efficiency >= 70 ? 'text-emerald-400' : 'text-amber-400')}>эфф. {spec.efficiency}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
