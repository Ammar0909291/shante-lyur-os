'use client';

import * as React from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  RefreshCw, AlertTriangle, TrendingDown, Package,
  Users, DollarSign, Clock, Activity, ChevronDown, ChevronUp,
  Tag, UserCheck, BarChart2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type RiskCategory =
  | 'DISCOUNT_ABUSE' | 'CASH_LEAKAGE' | 'PAYROLL_ANOMALY'
  | 'SLOT_MANIPULATION' | 'CLIENT_POACHING' | 'INVENTORY_SHRINKAGE'
  | 'CANCELLATION_FRAUD' | 'VIP_CHURN_RISK' | 'BURNOUT_RISK' | 'OPERATIONAL_ANOMALY';

interface RiskSignal {
  category:    RiskCategory;
  severity:    RiskSeverity;
  title:       string;
  description: string;
  entityType?: string;
  entityId?:   string;
  metadata?:   Record<string, unknown>;
}

interface SpecialistRiskSummary {
  specialistId:    string;
  name:            string;
  signalCount:     number;
  highestSeverity: RiskSeverity;
  categories:      RiskCategory[];
}

interface RiskDashboard {
  scannedAt:       string;
  periodDays:      number;
  overallScore:    number;
  riskLevel:       RiskSeverity;
  signals:         RiskSignal[];
  summary:         Partial<Record<RiskCategory, number>>;
  specialistRisks: SpecialistRiskSummary[];
}

interface StoredAlert {
  id:          string;
  category:    RiskCategory;
  severity:    RiskSeverity;
  title:       string;
  description: string;
  entityType?: string;
  entityId?:   string;
  detectedAt:  string;
  isDismissed: boolean;
  resolvedAt?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  LOW:      'text-green-400  bg-green-400/10  border-green-400/30',
  MEDIUM:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  HIGH:     'text-orange-400 bg-orange-400/10 border-orange-400/30',
  CRITICAL: 'text-red-400    bg-red-400/10    border-red-400/30',
};

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  LOW:      'НИЗКИЙ',
  MEDIUM:   'СРЕДНИЙ',
  HIGH:     'ВЫСОКИЙ',
  CRITICAL: 'КРИТИЧЕСКИЙ',
};

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  LOW:      'bg-green-400',
  MEDIUM:   'bg-yellow-400',
  HIGH:     'bg-orange-400',
  CRITICAL: 'bg-red-500',
};

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  DISCOUNT_ABUSE:      'Злоупотребление скидками',
  CASH_LEAKAGE:        'Утечка средств',
  PAYROLL_ANOMALY:     'Аномалия зарплаты',
  SLOT_MANIPULATION:   'Манипуляция слотами',
  CLIENT_POACHING:     'Переманивание клиентов',
  INVENTORY_SHRINKAGE: 'Недостача склада',
  CANCELLATION_FRAUD:  'Мошенничество с отменами',
  VIP_CHURN_RISK:      'Риск оттока VIP',
  BURNOUT_RISK:        'Риск выгорания',
  OPERATIONAL_ANOMALY: 'Операционная аномалия',
};

const CATEGORY_ICON: Record<RiskCategory, React.ElementType> = {
  DISCOUNT_ABUSE:      Tag,
  CASH_LEAKAGE:        DollarSign,
  PAYROLL_ANOMALY:     UserCheck,
  SLOT_MANIPULATION:   Clock,
  CLIENT_POACHING:     Users,
  INVENTORY_SHRINKAGE: Package,
  CANCELLATION_FRAUD:  AlertTriangle,
  VIP_CHURN_RISK:      TrendingDown,
  BURNOUT_RISK:        Activity,
  OPERATIONAL_ANOMALY: Zap,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityOrder(s: RiskSeverity): number {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[s] ?? 4;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { success: boolean; data: T };
  if (!json.success) throw new Error('API error');
  return json.data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ sev }: { sev: RiskSeverity }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide', SEVERITY_COLOR[sev])}>
      {SEVERITY_LABEL[sev]}
    </span>
  );
}

function ScoreGauge({ score, level }: { score: number; level: RiskSeverity }) {
  const color = { LOW: '#4ade80', MEDIUM: '#facc15', HIGH: '#fb923c', CRITICAL: '#f87171' }[level];
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle cx="64" cy="64" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Риск</p>
      </div>
    </div>
  );
}

function SignalCard({ signal, onDismiss }: { signal: RiskSignal; onDismiss?: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const Icon = CATEGORY_ICON[signal.category] ?? ShieldAlert;

  return (
    <div className={cn('rounded-xl border p-4 transition-all', SEVERITY_COLOR[signal.severity].split('text-')[0] + 'border-white/10 bg-zinc-900/60')}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', SEVERITY_COLOR[signal.severity].split('border')[0])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge sev={signal.severity} />
            <span className="text-xs text-zinc-500">{CATEGORY_LABEL[signal.category]}</span>
          </div>
          <p className="text-sm font-medium text-zinc-100 leading-snug">{signal.title}</p>
          {expanded && (
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{signal.description}</p>
          )}
          {expanded && signal.metadata && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {Object.entries(signal.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-1 text-xs">
                  <span className="text-zinc-500 shrink-0">{k}:</span>
                  <span className="text-zinc-300 font-mono truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setExpanded(e => !e)}
            className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {onDismiss && (
            <button onClick={onDismiss}
              className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Отклонить">
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert, onDismiss }: { alert: StoredAlert; onDismiss: (id: string) => void }) {
  const Icon = CATEGORY_ICON[alert.category] ?? ShieldAlert;
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/2 transition-colors group">
      <div className={cn('p-1.5 rounded', SEVERITY_COLOR[alert.severity].split('border')[0])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 font-medium truncate">{alert.title}</p>
        <p className="text-xs text-zinc-500 truncate">{alert.description}</p>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        <SeverityBadge sev={alert.severity} />
        <span className="text-xs text-zinc-600 hidden md:block">{new Date(alert.detectedAt).toLocaleDateString('ru-RU')}</span>
        <button onClick={() => onDismiss(alert.id)}
          className="opacity-0 group-hover:opacity-100 text-xs text-zinc-500 hover:text-green-400 transition-all px-2 py-1 rounded border border-transparent hover:border-green-400/30">
          Отклонить
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'live' | 'alerts' | 'specialists';

export default function RiskDashboardPage() {
  const [tab, setTab]         = React.useState<Tab>('live');
  const [days, setDays]       = React.useState(30);
  const [loading, setLoading] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<RiskDashboard | null>(null);
  const [alerts, setAlerts]   = React.useState<StoredAlert[]>([]);
  const [error, setError]     = React.useState('');
  const [catFilter, setCatFilter] = React.useState<RiskCategory | 'ALL'>('ALL');

  const loadDashboard = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch<RiskDashboard>(`/api/risk/dashboard?days=${days}`);
      setDashboard(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadAlerts = React.useCallback(async () => {
    try {
      const data = await apiFetch<StoredAlert[]>('/api/risk/alerts?dismissed=false&limit=100');
      setAlerts(data);
    } catch { /* non-critical */ }
  }, []);

  React.useEffect(() => { void loadDashboard(); void loadAlerts(); }, [loadDashboard, loadAlerts]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      await apiFetch(`/api/risk/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) });
      await Promise.all([loadDashboard(), loadAlerts()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const dismissAlert = async (id: string) => {
    try {
      await apiFetch('/api/risk/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'dismiss' }),
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const filteredSignals = React.useMemo(() => {
    if (!dashboard) return [];
    const sigs = dashboard.signals;
    const filtered = catFilter === 'ALL' ? sigs : sigs.filter(s => s.category === catFilter);
    return [...filtered].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  }, [dashboard, catFilter]);

  const criticalCount = dashboard?.signals.filter(s => s.severity === 'CRITICAL').length ?? 0;
  const highCount     = dashboard?.signals.filter(s => s.severity === 'HIGH').length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Аналитика рисков</h1>
            <p className="text-sm text-zinc-500">
              {dashboard
                ? `Сканировано ${new Date(dashboard.scannedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ${dashboard.signals.length} сигналов · период ${days}д`
                : 'Обнаружение мошенничества и аномалий'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-500">
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} дней</option>)}
          </select>
          <button onClick={() => loadDashboard()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Обновить
          </button>
          <button onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60">
            <ShieldAlert className={cn('w-4 h-4', scanning && 'animate-pulse')} />
            {scanning ? 'Сканирование…' : 'Запустить сканирование'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
          <ShieldX className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Row */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 flex flex-col items-center justify-center">
            <ScoreGauge score={dashboard.overallScore} level={dashboard.riskLevel} />
            <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Общий риск</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 flex flex-col justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Сигналы по уровням</p>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as RiskSeverity[]).map(sev => {
              const count = dashboard.signals.filter(s => s.severity === sev).length;
              return (
                <div key={sev} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', SEVERITY_DOT[sev])} />
                    <span className="text-xs text-zinc-400">{SEVERITY_LABEL[sev]}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-200">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Категории рисков</p>
            <div className="space-y-1.5">
              {Object.entries(dashboard.summary)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 truncate">{CATEGORY_LABEL[cat as RiskCategory] ?? cat}</span>
                    <span className="text-xs font-semibold text-zinc-200 ml-2">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Сохранённые тревоги</p>
            <p className="text-4xl font-bold text-zinc-100">{alerts.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Ожидают проверки</p>
            {criticalCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {criticalCount} критических
              </div>
            )}
            {highCount > 0 && criticalCount === 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {highCount} высоких
              </div>
            )}
            {alerts.length === 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Всё чисто
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-0">
        {([['live', 'Живой анализ', BarChart2], ['alerts', 'Тревоги', ShieldAlert], ['specialists', 'Сотрудники в риске', Users]] as [Tab, string, React.ElementType][]).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-red-400 text-red-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300',
            )}>
            <Icon className="w-4 h-4" />
            {label}
            {t === 'live' && dashboard && dashboard.signals.length > 0 && (
              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{dashboard.signals.length}</span>
            )}
            {t === 'alerts' && alerts.length > 0 && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Live Analysis */}
      {tab === 'live' && (
        <div>
          {loading && !dashboard && (
            <div className="flex items-center justify-center py-20 text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-3" />
              Выполняется анализ…
            </div>
          )}
          {dashboard && (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => setCatFilter('ALL')}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    catFilter === 'ALL' ? 'bg-zinc-700 border-zinc-600 text-zinc-100' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300')}>
                  Все ({dashboard.signals.length})
                </button>
                {Object.entries(dashboard.summary).map(([cat, count]) => (
                  <button key={cat} onClick={() => setCatFilter(cat as RiskCategory)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      catFilter === cat ? 'bg-zinc-700 border-zinc-600 text-zinc-100' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300')}>
                    {CATEGORY_LABEL[cat as RiskCategory] ?? cat} ({count})
                  </button>
                ))}
              </div>

              {filteredSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ShieldCheck className="w-12 h-12 text-green-400 mb-4" />
                  <p className="text-lg font-semibold text-zinc-300">Сигналы не обнаружены</p>
                  <p className="text-sm text-zinc-500 mt-1">Аномалий в выбранной категории за этот период не найдено.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSignals.map((sig, i) => (
                    <SignalCard key={`${sig.category}-${sig.entityId ?? ''}-${i}`} signal={sig} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Stored Alerts */}
      {tab === 'alerts' && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 overflow-hidden">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck className="w-12 h-12 text-green-400 mb-4" />
              <p className="text-lg font-semibold text-zinc-300">Нет сохранённых тревог</p>
              <p className="text-sm text-zinc-500 mt-1">Запустите сканирование для обнаружения и сохранения тревог.</p>
            </div>
          ) : (
            <div>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <p className="text-sm text-zinc-400">{alerts.length} активных тревог</p>
                <p className="text-xs text-zinc-600">Нажмите для отклонения</p>
              </div>
              {alerts
                .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
                .map(alert => (
                  <AlertRow key={alert.id} alert={alert} onDismiss={dismissAlert} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: At-Risk Specialists */}
      {tab === 'specialists' && (
        <div>
          {!dashboard || dashboard.specialistRisks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck className="w-12 h-12 text-green-400 mb-4" />
              <p className="text-lg font-semibold text-zinc-300">Нет сотрудников в зоне риска</p>
              <p className="text-sm text-zinc-500 mt-1">Нет сигналов риска, связанных с конкретными специалистами за этот период.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.specialistRisks.map(spec => (
                <div key={spec.specialistId} className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{spec.name || spec.specialistId.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">{spec.signalCount} сигналов</p>
                    </div>
                    <SeverityBadge sev={spec.highestSeverity} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {spec.categories.map(cat => {
                      const Icon = CATEGORY_ICON[cat] ?? ShieldAlert;
                      return (
                        <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400">
                          <Icon className="w-3 h-3" />
                          {CATEGORY_LABEL[cat]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
