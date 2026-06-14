'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, CheckCircle, X, ChevronDown, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import type {
  MassageWorkloadSummary,
  MassageSpecialistWorkload,
  MassageAlertsResponse,
  WorkloadAlert,
  AlertSeverity,
} from '@/types/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_TARGET = 6.0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString('sv-SE');
}

function severityColor(s: AlertSeverity) {
  if (s === 'critical') return 'text-red-400 bg-red-950/30 border-red-800/40';
  if (s === 'warning') return 'text-amber-400 bg-amber-950/30 border-amber-800/40';
  return 'text-sage bg-sage/10 border-sage/20';
}

function severityIcon(s: AlertSeverity) {
  if (s === 'critical') return <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
  if (s === 'warning') return <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
  return <Info className="w-3.5 h-3.5 shrink-0" />;
}

function progressColor(weight: number) {
  const pct = weight / DAILY_TARGET;
  if (pct >= 1) return 'bg-sage';
  if (pct >= 0.5) return 'bg-amber-400';
  return 'bg-red-500';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={cn(
      'bg-onyx border rounded-2xl p-5',
      accent ? 'border-champagne/30' : 'border-border-luxury',
    )}>
      <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">{label}</p>
      <p className="font-serif text-3xl font-medium text-text-primary leading-none tabular-nums">{value}</p>
      {sub && <p className="text-sm text-text-secondary mt-1">{sub}</p>}
    </div>
  );
}

function AlertRow({ alert, lang, t }: { alert: WorkloadAlert; lang: 'ru' | 'en'; t: (key: string) => string }) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-5 py-3.5 border rounded-xl',
      severityColor(alert.severity),
    )}>
      {severityIcon(alert.severity)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">
          {lang === 'ru' ? alert.message.ru : alert.message.en}
        </p>
        <p className="text-xs opacity-70 mt-0.5">
          {alert.sessionWeight.toFixed(1)} / {DAILY_TARGET.toFixed(1)} {t('analytics.massage.units')} · {alert.hoursLeftInDay.toFixed(1)}{t('analytics.massage.hoursLeft')}
        </p>
      </div>
    </div>
  );
}

function SpecialistCard({
  specialist,
  onOverride,
  onRemoveOverride,
  overrideLoading,
  t,
  lang,
}: {
  specialist: MassageSpecialistWorkload;
  onOverride: (id: string) => void;
  onRemoveOverride: (id: string) => void;
  overrideLoading: string | null;
  t: (key: string) => string;
  lang: 'ru' | 'en';
}) {
  const pct = Math.min(100, (specialist.sessionWeight / DAILY_TARGET) * 100);
  const isLoading = overrideLoading === specialist.id;
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-text-primary text-sm">{specialist.name}</p>
          {specialist.nextAppointment && (
            <p className="text-xs text-text-tertiary mt-0.5">
              {t('analytics.massage.nextSession')}: {new Date(specialist.nextAppointment).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {specialist.overridden && (
            <span className="text-xs font-medium text-sage bg-sage/10 border border-sage/20 rounded-full px-2.5 py-0.5">
              {t('analytics.massage.overriddenBadge')}
            </span>
          )}
          {specialist.targetMet && !specialist.overridden && (
            <CheckCircle className="w-4 h-4 text-sage" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-tertiary">
            {specialist.sessionWeight.toFixed(1)} / {DAILY_TARGET.toFixed(1)} {t('analytics.massage.units')}
          </span>
          <span className="text-xs text-text-tertiary">{specialist.sessionsToday} {t('analytics.massage.sessionsToday')}</span>
        </div>
        <div className="h-2 bg-charcoal rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressColor(specialist.sessionWeight))}
            style={{ width: `${pct}%` }}
          />
        </div>
        {specialist.remainingToTarget > 0 && !specialist.overridden && (
          <p className="text-xs text-text-tertiary mt-1">
            {t('analytics.massage.remainingToTarget')}: {specialist.remainingToTarget.toFixed(1)} {t('analytics.massage.units')}
          </p>
        )}
      </div>

      {/* Recommendation */}
      {specialist.schedulingRecommendation && (
        <p className="text-xs text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2">
          {specialist.schedulingRecommendation}
        </p>
      )}

      {/* Override reason (if set) */}
      {specialist.overridden && specialist.overrideReason && (
        <p className="text-xs text-text-tertiary italic">
          {t('analytics.massage.overrideReason')}: {specialist.overrideReason}
        </p>
      )}

      {/* Override actions */}
      <div className="pt-1 flex gap-2">
        {!specialist.overridden ? (
          <button
            onClick={() => onOverride(specialist.id)}
            disabled={isLoading}
            className="text-xs text-text-tertiary hover:text-champagne border border-border-luxury hover:border-champagne/40 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
          >
            {isLoading ? t('analytics.massage.saving') : t('analytics.massage.removeTarget')}
          </button>
        ) : (
          <button
            onClick={() => onRemoveOverride(specialist.id)}
            disabled={isLoading}
            className="text-xs text-text-tertiary hover:text-red-400 border border-border-luxury hover:border-red-800/40 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
          >
            {isLoading ? t('analytics.massage.deleting') : t('analytics.massage.restoreTarget')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Override modal ───────────────────────────────────────────────────────────

function OverrideModal({ specialistId, date, onClose, onSuccess }: {
  specialistId: string;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/analytics/massage/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialistId, date, reason: reason.trim() || undefined }),
      });
      if (!res.ok && res.status !== 409) {
        const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setErr(j.error?.message ?? t('analytics.massage.errorSave'));
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setErr(t('analytics.massage.errorNetwork'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">{t('analytics.massage.modalTitle')}</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-text-secondary">
            {t('analytics.massage.modalDescription')} {date}.
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('analytics.massage.reasonPlaceholder')}
            rows={3}
            className="w-full bg-obsidian border border-border-luxury text-text-primary text-sm rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 placeholder:text-text-tertiary"
          />
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-10 text-sm font-medium border border-border-luxury text-text-secondary hover:text-text-primary rounded-xl transition-colors"
          >
            {t('analytics.massage.cancel')}
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="flex-1 h-10 text-sm font-medium bg-champagne/15 border border-champagne/40 text-champagne hover:bg-champagne/25 rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? t('analytics.massage.saving') : t('analytics.massage.removeTarget')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MassageWorkloadPage() {
  const { t, lang } = useLanguage();

  const [date, setDate] = React.useState(todayStr);
  const [workload, setWorkload] = React.useState<MassageWorkloadSummary | null>(null);
  const [alerts, setAlerts] = React.useState<MassageAlertsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [overrideModalId, setOverrideModalId] = React.useState<string | null>(null);
  const [overrideLoading, setOverrideLoading] = React.useState<string | null>(null);
  const [showAlerts, setShowAlerts] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`/api/analytics/massage/workload?date=${d}`),
        fetch('/api/analytics/massage/alerts'),
      ]);
      if (!wRes.ok || !aRes.ok) {
        setError(t('analytics.massage.errorLoad'));
        return;
      }
      const [wJson, aJson] = await Promise.all([wRes.json(), aRes.json()]) as [
        { data: MassageWorkloadSummary },
        { data: MassageAlertsResponse },
      ];
      setWorkload(wJson.data);
      setAlerts(aJson.data);
    } catch {
      setError(t('analytics.massage.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { void load(date); }, [load, date]);

  const handleExport = React.useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/analytics/export/massage-workload?date=${date}`);
      if (!res.ok) { setError(t('analytics.massage.errorExport')); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `massage-workload-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('analytics.massage.errorExport'));
    } finally {
      setExporting(false);
    }
  }, [date, t]);

  async function handleRemoveOverride(specialistId: string) {
    setOverrideLoading(specialistId);
    try {
      const res = await fetch('/api/analytics/massage/override', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialistId, date }),
      });
      if (res.ok) await load(date);
    } finally {
      setOverrideLoading(null);
    }
  }

  const inputCls = 'bg-obsidian border border-border-luxury text-text-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40';

  const criticalAlerts = alerts?.alerts.filter(a => a.severity === 'critical') ?? [];
  const hasCritical = criticalAlerts.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* ── Override modal ── */}
      {overrideModalId && (
        <OverrideModal
          specialistId={overrideModalId}
          date={date}
          onClose={() => setOverrideModalId(null)}
          onSuccess={() => void load(date)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
            <Link href="/analytics" className="hover:text-champagne transition-colors">{t('analytics.massage.breadcrumbAnalytics')}</Link>
            <span>/</span>
            <span className="text-text-secondary">{t('analytics.massage.breadcrumbTitle')}</span>
          </div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {t('analytics.massage.title')}
          </h2>
          <p className="text-text-secondary text-sm mt-1">{t('analytics.massage.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputCls}
          />
          <button
            onClick={() => setDate(todayStr())}
            disabled={date === todayStr()}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-border-luxury text-text-secondary hover:text-champagne hover:border-champagne/40 transition-all disabled:opacity-40"
          >
            {t('analytics.massage.today')}
          </button>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-xl border border-border-luxury bg-onyx text-text-secondary hover:text-champagne hover:border-champagne/40 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {t('analytics.massage.exportXlsx')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-800/40 bg-red-950/20 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-onyx border border-border-luxury rounded-2xl p-5 animate-pulse">
              <div className="h-3 w-20 bg-charcoal rounded mb-3" />
              <div className="h-8 w-12 bg-charcoal rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && workload && (
        <>
          {/* ── Summary KPI row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <SummaryCard label={t('analytics.massage.total')} value={workload.summary.totalMassageSpecialists} />
            <SummaryCard label={t('analytics.massage.working')} value={workload.summary.workingToday} />
            <SummaryCard
              label={t('analytics.massage.meetingTarget')}
              value={workload.summary.meetingTarget}
              accent={workload.summary.meetingTarget > 0}
            />
            <SummaryCard label={t('analytics.massage.belowTarget')} value={workload.summary.belowTarget} />
            <SummaryCard label={t('analytics.massage.overridden')} value={workload.summary.overridden} />
          </div>

          {/* ── Alerts panel ── */}
          {alerts && alerts.alerts.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAlerts(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-charcoal/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-medium text-text-primary">
                    {t('analytics.massage.alerts')}
                  </h3>
                  {hasCritical && (
                    <span className="text-xs font-medium text-red-400 bg-red-950/30 border border-red-800/40 rounded-full px-2.5 py-0.5">
                      {criticalAlerts.length} {t('analytics.massage.criticalCount')}
                    </span>
                  )}
                  <span className="text-xs text-text-tertiary">
                    {alerts.totalAlerts} {t('analytics.massage.warningCount')}
                  </span>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-text-tertiary transition-transform', !showAlerts && '-rotate-90')} />
              </button>
              {showAlerts && (
                <div className="px-6 pb-5 space-y-2.5">
                  {alerts.alerts.map(alert => (
                    <AlertRow key={alert.specialistId} alert={alert} lang={lang} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Specialist cards ── */}
          {workload.specialists.length === 0 ? (
            <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-16 text-text-tertiary text-sm">
              {t('analytics.massage.emptyState')}
            </div>
          ) : (
            <div>
              <h3 className="font-serif text-lg font-medium text-text-primary mb-4">
                {t('analytics.massage.specialists')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {workload.specialists.map(s => (
                  <SpecialistCard
                    key={s.id}
                    specialist={s}
                    onOverride={id => setOverrideModalId(id)}
                    onRemoveOverride={id => void handleRemoveOverride(id)}
                    overrideLoading={overrideLoading}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
