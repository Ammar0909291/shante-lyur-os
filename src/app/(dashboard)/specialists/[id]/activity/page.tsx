'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, TrendingUp, Users, DollarSign, Calendar,
  CheckCircle, Clock, ChevronUp, ChevronDown, Plus, Trash2, Save,
  Download, AlertCircle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SpecialistInfo {
  id: string; name: string; department: string; specialization: string | null;
  status: string; avatarUrl: string | null;
  totalCommissionPending: number; totalCommissionApproved: number;
}

interface Summary {
  totalServices: number; totalSalesValue: number;
  totalCommissionEarned: number; workingDays: number;
  massageWorkloadPercent?: number;
}

interface ServiceRow {
  appointmentId: string; date: string; time: string; clientName: string;
  clientType: string; procedureName: string; duration: number;
  saleAmount: number; commissionPercent: number; commissionAmount: number;
  status: string; payrollEntryId: string | null;
}

interface ServiceSection {
  items: ServiceRow[];
  total: { saleAmount: number; commissionAmount: number };
}

interface PayrollEntry {
  entryId: string; date: string; appointmentId: string | null;
  clientName: string; clientType: string; roleOnSale: string;
  saleTotal: number; commissionPercent: number | null;
  commissionAmount: number; isManuallyEdited: boolean;
  status: string; notes: string | null; type: string; description: string | null;
}

interface Adjustment {
  id: string; description: string; amount: number; createdAt: string;
}

interface PayrollSection {
  entries: PayrollEntry[]; adjustments: Adjustment[]; periodTotal: number;
}

interface ClientDetail {
  clientName: string; clientType: string; visitCount: number;
  lastService: string; totalSpent: number;
}

interface ClientsSection {
  newClients: number; returningClients: number;
  subscriptionClients: number; repeatClientRate: number;
  detail: ClientDetail[];
}

interface AttendanceDay { date: string; status: string; }

interface LeaveRequest {
  id: string; startDate: string; endDate: string;
  reason: string; status: string; submittedOn: string;
}

interface AttendanceSection {
  days: AttendanceDay[]; workingDays: number; leaveRequests: LeaveRequest[];
}

interface ActivityData {
  specialist: SpecialistInfo;
  period: { from: string; to: string };
  summary: Summary;
  services: ServiceSection;
  payroll: PayrollSection;
  clients: ClientsSection;
  attendance: AttendanceSection;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function firstOfLastMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
}
function lastOfLastMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
}
function weekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

// Label maps are built from t() inside components that have access to useLanguage

const inputCls = 'px-2.5 py-1.5 rounded-lg bg-obsidian border border-border-luxury text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-champagne/30 disabled:opacity-50';

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', accent ?? 'bg-champagne/10 text-champagne')}>
        {icon}
      </div>
      <p className="text-xl font-semibold text-text-primary tabular-nums">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

// ─── SaveIndicator ────────────────────────────────────────────────────────────

function SaveIndicator({ saving, label }: { saving: boolean; label: string }) {
  if (!saving) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-charcoal border border-border-luxury shadow-xl">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-champagne" />
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

// ─── Inline editable cell ─────────────────────────────────────────────────────

function EditableCell({ value, onSave, type = 'text', className }: {
  value: string; onSave: (v: string) => void; type?: string; className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className={cn(inputCls, 'w-full', className)}
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn('cursor-pointer hover:text-text-primary underline decoration-dotted decoration-border-luxury', className)}
    >
      {value || <span className="text-text-muted italic">—</span>}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpecialistActivityPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const specialistId = params.id;
  const fromPage = searchParams.get('from') ?? 'specialists';

  const DEPT_LABELS: Record<string, string> = {
    COSMETOLOGY: t('ops.dept.cosmetology'),
    MASSAGE: t('ops.dept.massage'),
    MASSAGE_THERAPY: t('ops.dept.massage'),
    RECEPTION: t('ops.dept.reception'),
    MANAGEMENT: t('ops.dept.management'),
  };

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: t('specialist.activity.statusActive'),
    INACTIVE: t('specialist.activity.statusInactive'),
  };

  const DAY_STATUS_LABELS: Record<string, string> = {
    worked: t('specialist.activity.dayWorked'),
    'day-off': t('specialist.activity.dayOff'),
    leave: t('specialist.activity.dayLeave'),
    absent: t('specialist.activity.dayAbsent'),
  };

  const CLIENT_TYPE_LABELS: Record<string, string> = {
    new: t('sales.client.typeNew'),
    returning: t('sales.client.typeReturning'),
    subscription: t('sales.client.typeSubscription'),
  };

  const PRESETS = [
    { key: 'today', label: t('specialist.activity.preset.today') },
    { key: 'this-week', label: t('specialist.activity.preset.thisWeek') },
    { key: 'this-month', label: t('specialist.activity.preset.thisMonth') },
    { key: 'last-month', label: t('specialist.activity.preset.lastMonth') },
    { key: 'custom', label: t('specialist.activity.preset.custom') },
  ];

  // Filter state
  const [filterPreset, setFilterPreset] = React.useState<string>('this-month');
  const [customFrom, setCustomFrom] = React.useState(firstOfMonth());
  const [customTo, setCustomTo] = React.useState(todayStr());

  function resolvedRange(): { from: string; to: string } {
    switch (filterPreset) {
      case 'today': return { from: todayStr(), to: todayStr() };
      case 'this-week': return { from: weekStart(), to: todayStr() };
      case 'this-month': return { from: firstOfMonth(), to: lastOfMonth() };
      case 'last-month': return { from: firstOfLastMonth(), to: lastOfLastMonth() };
      case 'custom': return { from: customFrom, to: customTo };
      default: return { from: firstOfMonth(), to: lastOfMonth() };
    }
  }

  const { from, to } = resolvedRange();

  // Data state
  const [data, setData] = React.useState<ActivityData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState('');
  const [autoSaving, setAutoSaving] = React.useState(false);

  // Section collapse state
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  function toggle(s: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  // Adjustment form state
  const [adjDesc, setAdjDesc] = React.useState('');
  const [adjAmount, setAdjAmount] = React.useState('');
  const [adjSaving, setAdjSaving] = React.useState(false);

  async function loadData() {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(
        `/api/v1/specialists/${specialistId}/activity?from=${from}&to=${to}`,
        { credentials: 'include' }
      );
      const json = await res.json() as { success: boolean; data?: ActivityData; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setFetchError(json.error?.message ?? t('specialist.activity.errorLoad'));
        return;
      }
      setData(json.data!);
    } catch {
      setFetchError(t('specialist.activity.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Debounced auto-save for inline edits
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleAutoSave(fn: () => Promise<void>) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try { await fn(); } finally { setAutoSaving(false); }
    }, 500);
  }

  async function patchEntry(entryId: string, patch: Record<string, unknown>) {
    scheduleAutoSave(async () => {
      await fetch(`/api/v1/payroll-entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      await loadData();
    });
  }

  async function markAllApproved() {
    if (!data) return;
    setAutoSaving(true);
    try {
      await Promise.all(
        data.payroll.entries
          .filter((e) => e.status === 'pending')
          .map((e) =>
            fetch(`/api/v1/payroll-entries/${e.entryId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ entryStatus: 'approved' }),
            })
          )
      );
      await loadData();
    } finally {
      setAutoSaving(false);
    }
  }

  async function addAdjustment() {
    if (!adjDesc.trim() || adjAmount === '') return;
    setAdjSaving(true);
    try {
      await fetch('/api/v1/payroll-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          specialistId,
          description: adjDesc.trim(),
          amount: parseFloat(adjAmount),
          periodMonth: from.slice(0, 7),
        }),
      });
      setAdjDesc('');
      setAdjAmount('');
      await loadData();
    } finally {
      setAdjSaving(false);
    }
  }

  async function deleteAdjustment(id: string) {
    await fetch(`/api/v1/payroll-adjustments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await loadData();
  }

  function handleExport() {
    window.location.href = `/api/v1/payroll/export?from=${from}&to=${to}&specialistId=${specialistId}&format=xlsx`;
  }

  const backLabel = fromPage === 'payroll' ? t('specialist.activity.backPayroll') : t('specialist.activity.backSpecialists');

  const sp = data?.specialist;

  return (
    <div className="min-h-screen bg-obsidian">
      <SaveIndicator saving={autoSaving} label={t('specialist.activity.saving')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </button>

          {sp && (
            <div className="flex items-center gap-4 sm:ml-2">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-2xl bg-champagne/15 border border-champagne/30 flex items-center justify-center shrink-0">
                <span className="text-base font-semibold text-champagne">
                  {sp.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">{sp.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-champagne/10 text-champagne border border-champagne/20">
                    {DEPT_LABELS[sp.department] ?? sp.department}
                  </span>
                  {sp.specialization && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-text-muted border border-border-luxury">
                      {sp.specialization}
                    </span>
                  )}
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                    sp.status === 'ACTIVE' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-white/5 text-text-muted border-border-luxury'
                  )}>
                    {STATUS_LABELS[sp.status] ?? sp.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Calendar filter ───────────────────────────────────────────────── */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setFilterPreset(p.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    filterPreset === p.key
                      ? 'border-champagne/50 bg-champagne/10 text-champagne'
                      : 'border-border-luxury text-text-muted hover:text-text-secondary',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {filterPreset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-border-luxury bg-obsidian px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/30"
                />
                <span className="text-text-muted text-xs">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-border-luxury bg-obsidian px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/30"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {fetchError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-champagne" />
          </div>
        ) : data ? (
          <div className="space-y-6">

            {/* ── Section 1: Summary ─────────────────────────────────────────── */}
            <div className={cn('grid gap-4', data.summary.massageWorkloadPercent !== undefined ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4')}>
              <MetricCard icon={<Clock className="w-4 h-4" />} label={t('specialist.activity.metric.services')} value={String(data.summary.totalServices)} />
              <MetricCard icon={<DollarSign className="w-4 h-4" />} label={t('specialist.activity.metric.revenue')} value={formatCurrency(data.summary.totalSalesValue)} accent="bg-sky-400/10 text-sky-400" />
              <MetricCard icon={<TrendingUp className="w-4 h-4" />} label={t('specialist.activity.metric.commission')} value={formatCurrency(data.summary.totalCommissionEarned)} accent="bg-emerald-400/10 text-emerald-400" />
              <MetricCard icon={<Calendar className="w-4 h-4" />} label={t('specialist.activity.metric.workingDays')} value={String(data.summary.workingDays)} />
              {data.summary.massageWorkloadPercent !== undefined && (
                <MetricCard icon={<Users className="w-4 h-4" />} label={t('specialist.activity.metric.massageLoad')} value={`${data.summary.massageWorkloadPercent}%`} accent="bg-amber-400/10 text-amber-400" />
              )}
            </div>

            {/* ── Section 2: Services ────────────────────────────────────────── */}
            <SectionWrapper
              title={t('specialist.activity.section.services')}
              count={data.services.items.length}
              collapsed={collapsed.has('services')}
              onToggle={() => toggle('services')}
            >
              {data.services.items.length === 0 ? (
                <EmptyState text={t('specialist.activity.empty.services')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-luxury/60 text-text-muted uppercase tracking-wider">
                        <Th>{t('specialist.activity.col.date')}</Th><Th>{t('specialist.activity.col.time')}</Th><Th>{t('specialist.activity.col.client')}</Th><Th>{t('specialist.activity.col.type')}</Th>
                        <Th>{t('specialist.activity.col.service')}</Th><Th>{t('specialist.activity.col.min')}</Th><Th right>{t('specialist.activity.col.amount')}</Th>
                        <Th right>{t('specialist.activity.col.commPct')}</Th><Th right>{t('specialist.activity.col.commAmt')}</Th><Th>{t('specialist.activity.col.status')}</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-luxury/30">
                      {data.services.items.map((row) => (
                        <tr key={row.appointmentId} className="hover:bg-white/[0.015]">
                          <Td>{row.date}</Td>
                          <Td>{row.time}</Td>
                          <Td>{row.clientName}</Td>
                          <Td><ClientTypeBadge type={row.clientType} label={CLIENT_TYPE_LABELS[row.clientType] ?? row.clientType} /></Td>
                          <Td className="max-w-[180px] truncate">{row.procedureName}</Td>
                          <Td>{row.duration}</Td>
                          <Td right>{formatCurrency(row.saleAmount)}</Td>
                          <Td right>
                            {row.payrollEntryId ? (
                              <EditableCell
                                type="number"
                                value={String(row.commissionPercent)}
                                onSave={(v) => patchEntry(row.payrollEntryId!, { commissionBasis: parseFloat(v) })}
                                className="w-14 text-right"
                              />
                            ) : <span className="text-text-muted">—</span>}
                          </Td>
                          <Td right>
                            {row.payrollEntryId ? (
                              <EditableCell
                                type="number"
                                value={String(row.commissionAmount)}
                                onSave={(v) => patchEntry(row.payrollEntryId!, { commissionAmount: parseFloat(v) })}
                                className="w-20 text-right"
                              />
                            ) : <span className="text-text-muted">—</span>}
                          </Td>
                          <Td><EntryStatusBadge status={row.status} approvedLabel={t('specialist.activity.entryApproved')} pendingLabel={t('specialist.activity.entryPending')} /></Td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border-luxury text-text-secondary font-medium">
                        <Td colSpan={6} className="text-text-muted">{t('specialist.activity.col.total')}</Td>
                        <Td right>{formatCurrency(data.services.total.saleAmount)}</Td>
                        <Td right />
                        <Td right>{formatCurrency(data.services.total.commissionAmount)}</Td>
                        <Td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </SectionWrapper>

            {/* ── Section 3: Payroll detail ──────────────────────────────────── */}
            <SectionWrapper
              title={t('specialist.activity.section.payroll')}
              count={data.payroll.entries.length}
              collapsed={collapsed.has('payroll')}
              onToggle={() => toggle('payroll')}
              actions={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={markAllApproved}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/30 bg-sky-400/5 text-sky-400 text-xs font-medium hover:bg-sky-400/10 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('specialist.activity.approveAll')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-luxury text-text-muted text-xs font-medium hover:text-text-secondary transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    XLSX
                  </button>
                </div>
              }
            >
              {data.payroll.entries.length === 0 ? (
                <EmptyState text={t('specialist.activity.empty.payroll')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-luxury/60 text-text-muted uppercase tracking-wider">
                        <Th>{t('specialist.activity.col.date')}</Th><Th>{t('specialist.activity.col.client')}</Th><Th>{t('specialist.activity.col.role')}</Th>
                        <Th right>{t('specialist.activity.col.sale')}</Th><Th right>{t('specialist.activity.col.commPct')}</Th><Th right>{t('specialist.activity.col.commAmt')}</Th>
                        <Th>{t('specialist.activity.col.status')}</Th><Th>{t('specialist.activity.col.notes')}</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-luxury/30">
                      {data.payroll.entries.map((e) => (
                        <tr key={e.entryId} className="hover:bg-white/[0.015]">
                          <Td>{e.date}</Td>
                          <Td>{e.clientName}</Td>
                          <Td>{e.type === 'ADJUSTMENT' ? <span className="text-amber-400">{t('specialist.activity.adjustmentType')}</span> : e.roleOnSale}</Td>
                          <Td right>{e.saleTotal > 0 ? formatCurrency(e.saleTotal) : '—'}</Td>
                          <Td right>
                            {e.commissionPercent !== null ? (
                              <EditableCell
                                type="number"
                                value={String(e.commissionPercent)}
                                onSave={(v) => patchEntry(e.entryId, { commissionBasis: parseFloat(v) })}
                                className="w-14 text-right"
                              />
                            ) : '—'}
                          </Td>
                          <Td right>
                            <span className="flex items-center justify-end gap-1">
                              <EditableCell
                                type="number"
                                value={String(e.commissionAmount)}
                                onSave={(v) => patchEntry(e.entryId, { commissionAmount: parseFloat(v) })}
                                className="w-20 text-right"
                              />
                              {e.isManuallyEdited && (
                                <span title={t('specialist.activity.manuallyEdited')} className="text-amber-400">✎</span>
                              )}
                            </span>
                          </Td>
                          <Td>
                            <button
                              type="button"
                              onClick={() => patchEntry(e.entryId, { entryStatus: e.status === 'pending' ? 'approved' : 'pending' })}
                              className="cursor-pointer"
                            >
                              <EntryStatusBadge status={e.status} approvedLabel={t('specialist.activity.entryApproved')} pendingLabel={t('specialist.activity.entryPending')} />
                            </button>
                          </Td>
                          <Td>
                            <EditableCell
                              value={e.notes ?? ''}
                              onSave={(v) => patchEntry(e.entryId, { entryNotes: v })}
                              className="text-text-muted"
                            />
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Manual adjustments */}
              <div className="mt-4 border-t border-border-luxury/60 pt-4 space-y-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('specialist.activity.adjustmentTitle')}</p>

                {data.payroll.adjustments.length === 0 ? (
                  <p className="text-xs text-text-muted italic">{t('specialist.activity.noAdjustments')}</p>
                ) : (
                  <div className="space-y-2">
                    {data.payroll.adjustments.map((adj) => (
                      <div key={adj.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-obsidian/50 border border-border-luxury/50">
                        <p className="flex-1 text-xs text-text-secondary">{adj.description}</p>
                        <span className={cn('text-xs font-medium tabular-nums', adj.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {adj.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(adj.amount))}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteAdjustment(adj.id)}
                          className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add adjustment */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('specialist.activity.adjPlaceholder')}
                    value={adjDesc}
                    onChange={(e) => setAdjDesc(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-obsidian border border-border-luxury text-text-primary text-xs placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/30"
                  />
                  <input
                    type="number"
                    placeholder={t('specialist.activity.adjAmount')}
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl bg-obsidian border border-border-luxury text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-champagne/30"
                  />
                  <button
                    type="button"
                    onClick={addAdjustment}
                    disabled={adjSaving || !adjDesc.trim() || adjAmount === ''}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-champagne/30 bg-champagne/5 text-champagne text-xs font-medium hover:bg-champagne/10 disabled:opacity-40 transition-all"
                  >
                    {adjSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {t('specialist.activity.adjAdd')}
                  </button>
                </div>

                {/* Period total */}
                <div className="flex items-center justify-between pt-2 border-t border-border-luxury/60">
                  <span className="text-xs font-semibold text-text-secondary">{t('specialist.activity.periodTotal')}</span>
                  <span className="text-sm font-semibold text-champagne tabular-nums">{formatCurrency(data.payroll.periodTotal)}</span>
                </div>
              </div>
            </SectionWrapper>

            {/* ── Section 4: Clients ─────────────────────────────────────────── */}
            <SectionWrapper
              title={t('specialist.activity.section.clients')}
              collapsed={collapsed.has('clients')}
              onToggle={() => toggle('clients')}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <SmallMetric label={t('specialist.activity.clientNew')} value={data.clients.newClients} color="text-champagne" />
                <SmallMetric label={t('specialist.activity.clientReturning')} value={data.clients.returningClients} color="text-sky-400" />
                <SmallMetric label={t('specialist.activity.clientSubscription')} value={data.clients.subscriptionClients} color="text-emerald-400" />
                <SmallMetric label={t('specialist.activity.clientReturnRate')} value={`${data.clients.repeatClientRate}%`} color="text-text-primary" />
              </div>

              {data.clients.detail.length === 0 ? (
                <EmptyState text={t('specialist.activity.empty.clients')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-luxury/60 text-text-muted uppercase tracking-wider">
                        <Th>{t('specialist.activity.col.client')}</Th><Th>{t('specialist.activity.col.type')}</Th><Th right>{t('specialist.activity.col.visits')}</Th>
                        <Th>{t('specialist.activity.col.lastVisit')}</Th><Th right>{t('specialist.activity.col.spent')}</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-luxury/30">
                      {data.clients.detail.map((c, i) => (
                        <tr key={i} className="hover:bg-white/[0.015]">
                          <Td className="font-medium">{c.clientName}</Td>
                          <Td><ClientTypeBadge type={c.clientType} label={CLIENT_TYPE_LABELS[c.clientType] ?? c.clientType} /></Td>
                          <Td right>{c.visitCount}</Td>
                          <Td>{c.lastService}</Td>
                          <Td right>{formatCurrency(c.totalSpent)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionWrapper>

            {/* ── Section 5: Attendance ──────────────────────────────────────── */}
            <SectionWrapper
              title={t('specialist.activity.section.attendance')}
              collapsed={collapsed.has('attendance')}
              onToggle={() => toggle('attendance')}
            >
              {/* Calendar grid */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {data.attendance.days.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date} — ${DAY_STATUS_LABELS[d.status] ?? d.status}`}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium border',
                      d.status === 'worked' && 'bg-emerald-400/15 border-emerald-400/30 text-emerald-400',
                      d.status === 'day-off' && 'bg-white/5 border-border-luxury text-text-muted',
                      d.status === 'leave' && 'bg-sky-400/15 border-sky-400/30 text-sky-400',
                      d.status === 'absent' && 'bg-red-400/10 border-red-400/20 text-red-400',
                    )}
                  >
                    {new Date(d.date + 'T00:00:00').getDate()}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mb-5 text-xs">
                <LegendDot color="bg-emerald-400/60" label={t('specialist.activity.legendWorked')} />
                <LegendDot color="bg-white/20" label={t('specialist.activity.legendDayOff')} />
                <LegendDot color="bg-sky-400/60" label={t('specialist.activity.legendLeave')} />
                <LegendDot color="bg-red-400/50" label={t('specialist.activity.legendAbsent')} />
              </div>

              {/* Leave requests */}
              {data.attendance.leaveRequests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('specialist.activity.leaveTitle')}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-luxury/60 text-text-muted uppercase tracking-wider">
                          <Th>{t('specialist.activity.col.date')}</Th><Th>{t('specialist.activity.col.reason')}</Th><Th>{t('specialist.activity.col.status')}</Th><Th>{t('specialist.activity.col.submitted')}</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-luxury/30">
                        {data.attendance.leaveRequests.map((lr) => (
                          <tr key={lr.id} className="hover:bg-white/[0.015]">
                            <Td>{lr.startDate}{lr.endDate !== lr.startDate ? ` — ${lr.endDate}` : ''}</Td>
                            <Td>{lr.reason || '—'}</Td>
                            <Td>
                              <span className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                                lr.status === 'APPROVED' && 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
                                lr.status === 'PENDING' && 'bg-amber-400/10 text-amber-400 border-amber-400/20',
                                lr.status === 'REJECTED' && 'bg-red-400/10 text-red-400 border-red-400/20',
                              )}>
                                {lr.status === 'APPROVED' ? t('specialist.activity.leaveApproved') : lr.status === 'REJECTED' ? t('specialist.activity.leaveRejected') : t('specialist.activity.leavePending')}
                              </span>
                            </Td>
                            <Td>{lr.submittedOn}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionWrapper>

          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Small reusable components ────────────────────────────────────────────────

function SectionWrapper({ title, count, collapsed, onToggle, children, actions }: {
  title: string; count?: number; collapsed: boolean;
  onToggle: () => void; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-luxury/60">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-champagne transition-colors"
        >
          {title}
          {count !== undefined && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[11px] text-text-muted">{count}</span>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronUp className="w-4 h-4 text-text-muted" />}
        </button>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {!collapsed && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

function SmallMetric({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-obsidian/50 border border-border-luxury rounded-xl px-4 py-3">
      <p className={cn('text-xl font-semibold tabular-nums', color)}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

function Th({ children, right, colSpan }: { children?: React.ReactNode; right?: boolean; colSpan?: number }) {
  return (
    <th colSpan={colSpan} className={cn('px-3 py-2.5 text-left font-medium', right && 'text-right')}>
      {children}
    </th>
  );
}

function Td({ children, right, colSpan, className }: {
  children?: React.ReactNode; right?: boolean; colSpan?: number; className?: string;
}) {
  return (
    <td colSpan={colSpan} className={cn('px-3 py-2.5 text-text-secondary whitespace-nowrap', right && 'text-right', className)}>
      {children}
    </td>
  );
}

function ClientTypeBadge({ type, label }: { type: string; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
      type === 'new' && 'bg-champagne/10 text-champagne border-champagne/20',
      type === 'returning' && 'bg-sky-400/10 text-sky-400 border-sky-400/20',
      type === 'subscription' && 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    )}>
      {label}
    </span>
  );
}

function EntryStatusBadge({ status, approvedLabel, pendingLabel }: { status: string; approvedLabel: string; pendingLabel: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
      status === 'pending' && 'bg-white/5 text-text-muted border-border-luxury',
      status === 'approved' && 'bg-sky-400/10 text-sky-400 border-sky-400/20',
    )}>
      {status === 'approved' ? approvedLabel : pendingLabel}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-text-muted">{text}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-text-muted">
      <span className={cn('w-3 h-3 rounded-sm', color)} />
      {label}
    </span>
  );
}

// Suppress unused import warning for Save icon
void Save;
