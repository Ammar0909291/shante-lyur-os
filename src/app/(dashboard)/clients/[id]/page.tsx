'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, Calendar, AlertTriangle, FileText,
  Tag, Clock, Star, TrendingUp, Shield, ChevronRight, Plus, X, Loader2, CalendarPlus,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-fetch';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { SerializedAppointment } from '@/lib/appointment-serializer';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Allergy { id: string; allergen: string; severity: string; reaction: string | null; diagnosedAt: string | null }
interface Restriction { id: string; type: string; description: string; isActive: boolean; validFrom: string | null; validUntil: string | null }
interface ClientTag { id: string; tag: string; color: string | null }
interface SpecialistNote { id: string; specialistName: string; noteType: string; content: string; privacy: string; appointmentId: string | null; createdAt: string }
interface ProcedureEntry { id: string; serviceName: string; specialistName: string; performedAt: string; results: string | null; sideEffects: string | null; clientFeedback: string | null; followUpRequired: boolean; followUpDate: string | null }

interface ClientDetail {
  id: string; userId: string;
  firstName: string; lastName: string; email: string; phone: string | null;
  dateOfBirth: string | null; gender: string | null; skinType: string | null;
  hairType: string | null; bodyType: string | null;
  preferredLocationId: string | null; preferredSpecialistId: string | null;
  referralSource: string | null;
  firstVisitAt: string | null; lastVisitAt: string | null;
  totalVisits: number; totalSpent: number; loyaltyPoints: number;
  loyaltyTier: string; churnRiskScore: number | null; notes: string | null;
  createdAt: string; updatedAt: string;
  allergies: Allergy[];
  restrictions: Restriction[];
  tags: ClientTag[];
  specialistNotes: SpecialistNote[];
  procedureHistory: ProcedureEntry[];
  recentAppointments: SerializedAppointment[];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, { label: string; cls: string }> = {
  PLATINUM: { label: 'Platinum', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  GOLD:     { label: 'Gold',     cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  SILVER:   { label: 'Silver',   cls: 'bg-slate-400/20 text-slate-300 border-slate-400/40' },
  BRONZE:   { label: 'Bronze',   cls: 'bg-orange-800/20 text-orange-300 border-orange-800/40' },
};

const SEVERITY_CFG: Record<string, { label: string; cls: string }> = {
  mild:     { label: 'слабая',  cls: 'text-yellow-400 bg-yellow-400/10' },
  moderate: { label: 'средняя', cls: 'text-orange-400 bg-orange-400/10' },
  severe:   { label: 'сильная', cls: 'text-red-400 bg-red-400/10' },
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  consultation: 'Консультация', procedure: 'Процедура',
  followup: 'Наблюдение', general: 'Общее', complaint: 'Жалоба',
};

const APT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает', CONFIRMED: 'Подтверждён', IN_PROGRESS: 'Идёт',
  COMPLETED: 'Завершён', CANCELLED: 'Отменён', NO_SHOW: 'Неявка', RESCHEDULED: 'Перенесён',
};

const APT_STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400', CONFIRMED: 'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-purple-500/15 text-purple-400', COMPLETED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400', NO_SHOW: 'bg-gray-500/15 text-gray-400',
  RESCHEDULED: 'bg-orange-500/15 text-orange-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, icon, action, children }: {
  title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border-luxury">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary">{icon}</span>
          <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-charcoal/40 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="text-xl font-semibold text-text-primary leading-tight">{value}</span>
      {sub && <span className="text-xs text-text-tertiary">{sub}</span>}
    </div>
  );
}

// ─── Allergy panel ────────────────────────────────────────────────────────────
function AllergyPanel({ profileId, initial }: { profileId: string; initial: Allergy[] }) {
  const [list, setList] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ allergen: '', severity: 'moderate', reaction: '' });

  async function handleAdd() {
    if (!form.allergen.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/customers/${profileId}/allergies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergen: form.allergen.trim(), severity: form.severity, reaction: form.reaction.trim() || undefined }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setList(prev => [json.data, ...prev]);
        setForm({ allergen: '', severity: 'moderate', reaction: '' });
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/api/customers/${profileId}/allergies/${id}`, { method: 'DELETE' });
      setList(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Section
      title="Аллергии"
      icon={<AlertTriangle className="w-4 h-4" />}
      action={
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Добавить
        </button>
      }
    >
      {open && (
        <div className="mb-4 p-4 bg-charcoal/30 border border-border-luxury rounded-xl space-y-3">
          <Input
            placeholder="Название аллергена"
            value={form.allergen}
            onChange={e => setForm(f => ({ ...f, allergen: e.target.value }))}
          />
          <select
            value={form.severity}
            onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
            className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-gold/50"
          >
            <option value="mild">Слабая</option>
            <option value="moderate">Средняя</option>
            <option value="severe">Сильная</option>
          </select>
          <Input
            placeholder="Реакция (необязательно)"
            value={form.reaction}
            onChange={e => setForm(f => ({ ...f, reaction: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !form.allergen.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Сохранить'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-text-tertiary">Аллергии не указаны</p>
      ) : (
        <div className="space-y-3">
          {list.map(a => {
            const sev = SEVERITY_CFG[a.severity] ?? SEVERITY_CFG.mild;
            return (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{a.allergen}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sev.cls}`}>{sev.label}</span>
                  </div>
                  {a.reaction && <p className="text-xs text-text-secondary mt-1">{a.reaction}</p>}
                  {a.diagnosedAt && (
                    <p className="text-[10px] text-text-tertiary mt-1">Выявлено: {formatDate(new Date(a.diagnosedAt))}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deleting === a.id}
                  className="text-text-tertiary hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  aria-label="Удалить"
                >
                  {deleting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ─── Tag panel ────────────────────────────────────────────────────────────────
function TagPanel({ profileId, initial }: { profileId: string; initial: ClientTag[] }) {
  const [list, setList] = React.useState(initial);
  const [tagInput, setTagInput] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function handleAdd() {
    const tag = tagInput.trim();
    if (!tag || list.some(t => t.tag === tag)) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/customers/${profileId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setList(prev => [...prev, json.data]);
        setTagInput('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: ClientTag) {
    setDeleting(t.id);
    try {
      await apiFetch(`/api/customers/${profileId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: t.tag }),
      });
      setList(prev => prev.filter(x => x.id !== t.id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.map(t => (
        <span
          key={t.id}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-border-luxury text-text-tertiary"
          style={t.color ? { borderColor: `${t.color}50`, color: t.color } : {}}
        >
          {t.tag}
          <button
            onClick={() => handleDelete(t)}
            disabled={deleting === t.id}
            className="ml-0.5 hover:text-red-400 transition-colors"
            aria-label={`Удалить тег ${t.tag}`}
          >
            {deleting === t.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X className="w-2.5 h-2.5" />}
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="+ тег"
          className="w-20 bg-transparent border-b border-border-luxury text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-gold/50 py-0.5"
          maxLength={50}
        />
        {tagInput.trim() && (
          <button
            onClick={handleAdd}
            disabled={saving}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Notes panel ──────────────────────────────────────────────────────────────
function NotesPanel({ profileId, initial, currentSpecialistId }: {
  profileId: string; initial: SpecialistNote[]; currentSpecialistId: string | null;
}) {
  const [list, setList] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ noteType: 'general', content: '', privacy: 'SHARED' });

  async function handleAdd() {
    if (!form.content.trim() || !currentSpecialistId) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/customers/${profileId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialistId: currentSpecialistId,
          noteType: form.noteType,
          content: form.content.trim(),
          privacy: form.privacy,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // Note doesn't include specialistName — reload or use placeholder
        setList(prev => [{
          id: json.data.id,
          specialistName: 'Вы',
          noteType: form.noteType,
          content: form.content.trim(),
          privacy: form.privacy,
          appointmentId: null,
          createdAt: json.data.createdAt ?? new Date().toISOString(),
        }, ...prev]);
        setForm({ noteType: 'general', content: '', privacy: 'SHARED' });
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Записи специалистов"
      icon={<FileText className="w-4 h-4" />}
      action={currentSpecialistId ? (
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Добавить
        </button>
      ) : undefined}
    >
      {open && (
        <div className="mb-4 p-4 bg-charcoal/30 border border-border-luxury rounded-xl space-y-3">
          <div className="flex gap-2">
            <select
              value={form.noteType}
              onChange={e => setForm(f => ({ ...f, noteType: e.target.value }))}
              className="flex-1 bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-gold/50"
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={form.privacy}
              onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))}
              className="flex-1 bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-gold/50"
            >
              <option value="SHARED">Общая</option>
              <option value="PRIVATE">Личная</option>
              <option value="ADMIN_ONLY">Только admin</option>
            </select>
          </div>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Текст записи..."
            rows={4}
            className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-gold/50 resize-none"
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !form.content.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Сохранить'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-text-tertiary">Записи специалистов отсутствуют</p>
      ) : (
        <div className="space-y-3">
          {list.map(n => (
            <div key={n.id} className="p-3 bg-charcoal/30 border border-border-luxury rounded-xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-primary">{n.specialistName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-charcoal text-text-tertiary">
                    {NOTE_TYPE_LABELS[n.noteType] ?? n.noteType}
                  </span>
                </div>
                <span className="text-[10px] text-text-tertiary">{formatDate(new Date(n.createdAt))}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Restriction list (read-only) ─────────────────────────────────────────────
function RestrictionList({ restrictions }: { restrictions: Restriction[] }) {
  const active = restrictions.filter(r => r.isActive);
  const typeLabel: Record<string, string> = {
    medical: 'Медицинское', pregnancy: 'Беременность', medication: 'Препарат', other: 'Другое',
  };
  if (active.length === 0) return <p className="text-sm text-text-tertiary">Противопоказания не указаны</p>;
  return (
    <div className="space-y-3">
      {active.map(r => (
        <div key={r.id} className="flex items-start gap-3 p-3 bg-orange-500/5 border border-orange-500/15 rounded-xl">
          <Shield className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-text-primary">{r.description}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                {typeLabel[r.type] ?? r.type}
              </span>
            </div>
            {(r.validFrom || r.validUntil) && (
              <p className="text-[10px] text-text-tertiary mt-1">
                {r.validFrom && `с ${formatDate(new Date(r.validFrom))}`}
                {r.validUntil && ` по ${formatDate(new Date(r.validUntil))}`}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Procedure timeline (read-only) ──────────────────────────────────────────
function ProcedureTimeline({ history }: { history: ProcedureEntry[] }) {
  if (history.length === 0) return <p className="text-sm text-text-tertiary">История процедур пуста</p>;
  return (
    <div className="space-y-4">
      {history.map(p => (
        <div key={p.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-accent-gold mt-1.5 shrink-0" />
            <div className="w-px flex-1 bg-border-luxury mt-1" />
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{p.serviceName}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{p.specialistName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-text-tertiary">{formatDate(new Date(p.performedAt))}</p>
                {p.followUpRequired && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 mt-1 inline-block">
                    Повтор нужен
                  </span>
                )}
              </div>
            </div>
            {p.results && <p className="text-xs text-text-secondary mt-1 leading-relaxed">{p.results}</p>}
            {p.sideEffects && <p className="text-xs text-orange-400 mt-1">⚠ {p.sideEffects}</p>}
            {p.clientFeedback && <p className="text-xs text-text-tertiary mt-1 italic">«{p.clientFeedback}»</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Appointment row ──────────────────────────────────────────────────────────
function AppointmentRow({ apt }: { apt: SerializedAppointment }) {
  const cls = APT_STATUS_CLS[apt.status] ?? 'bg-gray-500/15 text-gray-400';
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-luxury last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{apt.serviceName}</p>
        <p className="text-xs text-text-tertiary mt-0.5">{apt.specialistName} · {formatDate(new Date(apt.startAt))}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium text-text-primary">{formatCurrency(apt.totalPrice)}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
          {APT_STATUS_LABELS[apt.status] ?? apt.status}
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'profile' | 'medical' | 'history';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = React.useState<ClientDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>('overview');
  const [currentSpecialistId, setCurrentSpecialistId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/customers/${params.id}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error?.message ?? 'Не удалось загрузить профиль');
          return;
        }
        setClient(json.data);
      } catch {
        setError('Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    }
    async function resolveSpecialist() {
      try {
        const res = await apiFetch('/api/specialists/me');
        const json = await res.json();
        if (res.ok && json.success && json.data?.id) {
          setCurrentSpecialistId(json.data.id);
        }
      } catch { /* not a specialist */ }
    }
    load();
    resolveSpecialist();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-text-tertiary text-sm">
        Загрузка...
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 lg:p-8">
        <Link href="/clients" className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Назад к клиентам
        </Link>
        <p className="text-text-secondary">{error ?? 'Профиль не найден'}</p>
      </div>
    );
  }

  const name = `${client.firstName} ${client.lastName}`.trim();
  const tier = TIER_CONFIG[client.loyaltyTier] ?? TIER_CONFIG.BRONZE;
  const churnRisk = client.churnRiskScore != null ? Math.round(client.churnRiskScore * 100) : null;

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: 'Обзор' },
    { key: 'profile',  label: 'Профиль' },
    { key: 'medical',  label: 'Медкарта' },
    { key: 'history',  label: 'История' },
  ];

  const activeRestrictions = client.restrictions.filter(r => r.isActive);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/clients" className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Клиенты
        </Link>
        <Link href={`/bookings?clientId=${client.id}`}>
          <Button variant="primary" size="sm" leftIcon={<CalendarPlus className="w-4 h-4" />}>
            Записать
          </Button>
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <Avatar name={name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-2xl font-medium text-text-primary">{name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${tier.cls}`}>{tier.label}</span>
            </div>
            {/* Inline tag management in header */}
            <div className="mt-2">
              <TagPanel profileId={client.id} initial={client.tags} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Mail className="w-3.5 h-3.5" /> {client.email}
              </span>
              {client.phone && (
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Phone className="w-3.5 h-3.5" /> {client.phone}
                </span>
              )}
              {client.firstVisitAt && (
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Calendar className="w-3.5 h-3.5" /> С нами с {formatDate(new Date(client.firstVisitAt))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <StatCard label="Визитов" value={String(client.totalVisits)} />
          <StatCard label="Потрачено" value={formatCurrency(client.totalSpent)} />
          <StatCard
            label="Последний визит"
            value={client.lastVisitAt ? formatDate(new Date(client.lastVisitAt)) : '—'}
          />
          <StatCard
            label={churnRisk != null && churnRisk >= 70 ? 'Риск оттока' : 'Лояльность'}
            value={churnRisk != null ? `${churnRisk}%` : `${client.loyaltyPoints} pts`}
            sub={churnRisk != null && churnRisk >= 70 ? 'Требует внимания' : undefined}
          />
        </div>
      </div>

      {/* Safety alert banner */}
      {(client.allergies.length > 0 || activeRestrictions.length > 0) && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-red-300">Важно: </span>
            <span className="text-text-secondary">
              {[
                client.allergies.length > 0 && `аллергии (${client.allergies.length})`,
                activeRestrictions.length > 0 && `противопоказания (${activeRestrictions.length})`,
              ].filter(Boolean).join(', ')}
              {' '}— перед процедурой ознакомьтесь с Медкартой
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-charcoal/40 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-onyx text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <Section title="Последние записи" icon={<Clock className="w-4 h-4" />}>
            {client.recentAppointments.length === 0 ? (
              <p className="text-sm text-text-tertiary">Записей пока нет</p>
            ) : (
              <div>
                {client.recentAppointments.map(apt => <AppointmentRow key={apt.id} apt={apt} />)}
                {client.recentAppointments.length >= 10 && (
                  <Link href={`/bookings?clientId=${client.userId}`} className="flex items-center gap-1 mt-3 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                    Все записи <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </Section>

          <Section title="Прогресс лояльности" icon={<Star className="w-4 h-4" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Уровень: <span className={`font-medium ${tier.cls.split(' ')[1]}`}>{tier.label}</span>
                </span>
                <span className="text-text-tertiary">{client.loyaltyPoints} баллов</span>
              </div>
              {client.totalSpent > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-text-tertiary">
                    <span>Потрачено: {formatCurrency(client.totalSpent)}</span>
                    <span>Следующий уровень</span>
                  </div>
                  <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-gold rounded-full transition-all"
                      style={{ width: `${Math.min(100, (client.totalSpent / 50_000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── Profile ── */}
      {tab === 'profile' && (
        <Section title="Личные данные" icon={<TrendingUp className="w-4 h-4" />}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { label: 'Дата рождения', value: client.dateOfBirth ? formatDate(new Date(client.dateOfBirth)) : null },
              { label: 'Пол', value: client.gender === 'female' ? 'Женский' : client.gender === 'male' ? 'Мужской' : client.gender },
              { label: 'Тип кожи',   value: client.skinType },
              { label: 'Тип волос',  value: client.hairType },
              { label: 'Тип фигуры', value: client.bodyType },
              { label: 'Источник',   value: client.referralSource },
            ] as Array<{ label: string; value: string | null | undefined }>).map(({ label, value }) => value ? (
              <div key={label}>
                <dt className="text-xs text-text-tertiary mb-0.5">{label}</dt>
                <dd className="text-sm text-text-primary">{value}</dd>
              </div>
            ) : null)}
          </dl>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-border-luxury">
              <p className="text-xs text-text-tertiary mb-1">Заметки</p>
              <p className="text-sm text-text-secondary leading-relaxed">{client.notes}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── Medical ── */}
      {tab === 'medical' && (
        <div className="space-y-6">
          <AllergyPanel profileId={client.id} initial={client.allergies} />
          <Section title="Противопоказания" icon={<Shield className="w-4 h-4" />}>
            <RestrictionList restrictions={client.restrictions} />
          </Section>
          <NotesPanel profileId={client.id} initial={client.specialistNotes} currentSpecialistId={currentSpecialistId} />
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <Section title="История процедур" icon={<Tag className="w-4 h-4" />}>
          <ProcedureTimeline history={client.procedureHistory} />
        </Section>
      )}
    </div>
  );
}
