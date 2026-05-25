'use client';

import React from 'react';
import {
  Clock, UserPlus, Bell, CheckCircle2, XCircle, Trash2,
  ChevronLeft, ChevronRight, CalendarDays, User, Scissors, MapPin, StickyNote,
  Loader2, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaitlistEntry {
  id:             string;
  status:         string;
  preferredDate:  string | null;
  preferredFrom:  string | null;
  preferredTo:    string | null;
  notes:          string | null;
  notifiedAt:     string | null;
  expiresAt:      string | null;
  createdAt:      string;
  specialistName: string | null;
  client:         { id: string; firstName: string; lastName: string; phone: string | null; email: string | null };
  service:        { id: string; name: string };
  specialist:     { id: string } | null;
  location:       { id: string; name: string } | null;
}

interface WaitlistPage {
  items:      WaitlistEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

type StatusFilter = '' | 'WAITING' | 'NOTIFIED' | 'BOOKED' | 'EXPIRED' | 'CANCELLED';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '',           label: 'Все'        },
  { value: 'WAITING',    label: 'Ожидание'   },
  { value: 'NOTIFIED',   label: 'Оповещены'  },
  { value: 'BOOKED',     label: 'Записаны'   },
  { value: 'EXPIRED',    label: 'Истёк'      },
  { value: 'CANCELLED',  label: 'Отменено'   },
];

const STATUS_BADGE: Record<string, string> = {
  WAITING:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  NOTIFIED:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  BOOKED:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  EXPIRED:   'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  WAITING:   'Ожидание',
  NOTIFIED:  'Оповещён',
  BOOKED:    'Записан',
  EXPIRED:   'Истёк',
  CANCELLED: 'Отменено',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function clientName(c: WaitlistEntry['client']): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

// ─── Add dialog ───────────────────────────────────────────────────────────────

interface AddDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onAdded:      () => void;
}

interface ServiceOption  { id: string; name: string }
interface ClientOption   { id: string; firstName: string; lastName: string; phone: string | null }
interface SpecialistOption { id: string; userId: string; user: { firstName: string; lastName: string } }

function AddWaitlistDialog({ open, onOpenChange, onAdded }: AddDialogProps) {
  const [clients,     setClients]     = React.useState<ClientOption[]>([]);
  const [services,    setServices]    = React.useState<ServiceOption[]>([]);
  const [specialists, setSpecialists] = React.useState<SpecialistOption[]>([]);
  const [clientQ,     setClientQ]     = React.useState('');
  const [form, setForm] = React.useState({
    clientId: '', serviceId: '', specialistId: '', preferredDate: '', preferredFrom: '', preferredTo: '', notes: '',
  });
  const [busy,  setBusy]  = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/services?limit=200').then((r) => r.json()),
      fetch('/api/specialists?limit=100').then((r) => r.json()),
    ]).then(([svcJson, spJson]) => {
      if (svcJson.success) setServices(svcJson.data?.items ?? svcJson.data ?? []);
      if (spJson.success)  setSpecialists(spJson.data?.items ?? spJson.data ?? []);
    }).catch(() => {});
  }, [open]);

  React.useEffect(() => {
    if (!open || clientQ.length < 2) { setClients([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/clients?search=${encodeURIComponent(clientQ)}&limit=20`)
        .then((r) => r.json())
        .then((j) => { if (j.success) setClients(j.data?.items ?? j.data ?? []); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [clientQ, open]);

  function update(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.clientId || !form.serviceId) { setError('Выберите клиента и услугу'); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        clientId:  form.clientId,
        serviceId: form.serviceId,
      };
      if (form.specialistId) body.specialistId = form.specialistId;
      if (form.preferredDate) body.preferredDate = form.preferredDate;
      if (form.preferredFrom) body.preferredFrom = form.preferredFrom;
      if (form.preferredTo)   body.preferredTo   = form.preferredTo;
      if (form.notes.trim())  body.notes         = form.notes.trim();

      const res  = await fetch('/api/v1/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
      onAdded();
      onOpenChange(false);
      setForm({ clientId: '', serviceId: '', specialistId: '', preferredDate: '', preferredFrom: '', preferredTo: '', notes: '' });
      setClientQ('');
    } catch { setError('Ошибка сети'); }
    finally { setBusy(false); }
  }

  if (!open) return null;

  const selectedClient = clients.find((c) => c.id === form.clientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-md bg-charcoal border border-border-luxury rounded-2xl p-6 space-y-4 shadow-2xl">
        <h2 className="text-lg font-semibold text-text-primary">Добавить в лист ожидания</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Client search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Клиент</label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border border-champagne/40 bg-champagne/5 px-3 py-2">
                <span className="text-sm text-text-primary">{selectedClient.firstName} {selectedClient.lastName}</span>
                <button type="button" onClick={() => { update('clientId', ''); setClientQ(''); }} className="text-text-muted hover:text-text-primary text-xs">✕</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-muted" />
                <input
                  value={clientQ}
                  onChange={(e) => setClientQ(e.target.value)}
                  placeholder="Поиск по имени или телефону…"
                  className="w-full rounded-lg border border-border-luxury bg-obsidian pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
                />
                {clients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-charcoal border border-border-luxury rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { update('clientId', c.id); setClientQ(''); setClients([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 text-text-primary"
                      >
                        {c.firstName} {c.lastName}
                        {c.phone && <span className="text-text-muted ml-2 text-xs">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Service */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Услуга</label>
            <select
              value={form.serviceId}
              onChange={(e) => update('serviceId', e.target.value)}
              required
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            >
              <option value="">Выберите услугу…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Specialist */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Специалист (необязательно)</label>
            <select
              value={form.specialistId}
              onChange={(e) => update('specialistId', e.target.value)}
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            >
              <option value="">Любой специалист</option>
              {specialists.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.user.firstName} {sp.user.lastName}</option>
              ))}
            </select>
          </div>

          {/* Preferred date/time */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1 col-span-3 sm:col-span-1">
              <label className="text-xs font-medium text-text-secondary">Дата (желаемая)</label>
              <input type="date" value={form.preferredDate} onChange={(e) => update('preferredDate', e.target.value)}
                className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">С</label>
              <input type="time" value={form.preferredFrom} onChange={(e) => update('preferredFrom', e.target.value)}
                className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">До</label>
              <input type="time" value={form.preferredTo} onChange={(e) => update('preferredTo', e.target.value)}
                className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Примечания</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} maxLength={2000}
              placeholder="Дополнительные пожелания…"
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40 resize-none" />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>Отмена</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={busy}>Добавить</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const [data,       setData]       = React.useState<WaitlistPage | null>(null);
  const [loading,    setLoading]    = React.useState(true);
  const [page,       setPage]       = React.useState(1);
  const [status,     setStatus]     = React.useState<StatusFilter>('WAITING');
  const [showAdd,    setShowAdd]    = React.useState(false);
  const [actionId,   setActionId]   = React.useState<string | null>(null);

  const load = React.useCallback(async (p: number, s: StatusFilter) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: '25' });
      if (s) qs.set('status', s);
      const res  = await fetch(`/api/v1/waitlist?${qs}`);
      const json = await res.json();
      if (json.success) setData(json.data as WaitlistPage);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { setPage(1); void load(1, status); }, [load, status]);

  async function updateStatus(id: string, newStatus: string) {
    setActionId(id);
    try {
      await fetch(`/api/v1/waitlist/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      void load(page, status);
    } finally { setActionId(null); }
  }

  async function remove(id: string) {
    if (!confirm('Удалить запись из листа ожидания?')) return;
    setActionId(id);
    try {
      await fetch(`/api/v1/waitlist/${id}`, { method: 'DELETE' });
      void load(page, status);
    } finally { setActionId(null); }
  }

  const waitingCount = data?.items.filter((e) => e.status === 'WAITING').length ?? 0;

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Лист ожидания</h1>
            {data && data.total > 0 && (
              <p className="text-sm text-text-muted mt-0.5">{data.total} записей · {waitingCount} ожидают</p>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Добавить
          </Button>
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-charcoal/60 border border-border-luxury rounded-lg p-0.5 w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                status === f.value
                  ? 'bg-charcoal text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка…
            </div>
          )}

          {!loading && (!data || data.items.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-8 h-8 text-text-muted mb-3" />
              <p className="text-sm text-text-primary font-medium">Лист ожидания пуст</p>
              <p className="text-xs text-text-muted mt-1">Добавьте клиентов, которые ждут свободного окна</p>
            </div>
          )}

          {!loading && data && data.items.length > 0 && (
            <div className="divide-y divide-border-luxury/40">
              {data.items.map((entry) => {
                const busy = actionId === entry.id;
                return (
                  <div key={entry.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Status badge + position */}
                      <div className="shrink-0 pt-0.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border', STATUS_BADGE[entry.status] ?? 'bg-charcoal text-text-muted border-border-luxury')}>
                          {STATUS_LABEL[entry.status] ?? entry.status}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">{clientName(entry.client)}</span>
                          {entry.client.phone && (
                            <span className="text-xs text-text-muted">{entry.client.phone}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Scissors className="w-3 h-3" />
                            {entry.service.name}
                          </span>
                          {entry.specialistName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.specialistName}
                            </span>
                          )}
                          {entry.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.location.name}
                            </span>
                          )}
                          {entry.preferredDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {entry.preferredDate}
                              {entry.preferredFrom && ` ${entry.preferredFrom}–${entry.preferredTo ?? '?'}`}
                            </span>
                          )}
                          {entry.notes && (
                            <span className="flex items-center gap-1">
                              <StickyNote className="w-3 h-3" />
                              {entry.notes.slice(0, 60)}{entry.notes.length > 60 ? '…' : ''}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-text-tertiary">В листе с {fmt(entry.createdAt)}</p>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1">
                        {entry.status === 'WAITING' && (
                          <button
                            type="button"
                            title="Оповестить"
                            disabled={busy}
                            onClick={() => updateStatus(entry.id, 'NOTIFIED')}
                            className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-40"
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                        )}
                        {(entry.status === 'WAITING' || entry.status === 'NOTIFIED') && (
                          <button
                            type="button"
                            title="Отметить как записан"
                            disabled={busy}
                            onClick={() => updateStatus(entry.id, 'BOOKED')}
                            className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {!['BOOKED', 'EXPIRED', 'CANCELLED'].includes(entry.status) && (
                          <button
                            type="button"
                            title="Отменить"
                            disabled={busy}
                            onClick={() => updateStatus(entry.id, 'CANCELLED')}
                            className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Удалить"
                          disabled={busy}
                          onClick={() => remove(entry.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border-luxury/40 bg-obsidian/20">
              <p className="text-xs text-text-muted">
                Стр. {data.page} из {data.totalPages} · {data.total} всего
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); void load(p, status); }}
                  className="p-1.5 rounded text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => { const p = page + 1; setPage(p); void load(p, status); }}
                  className="p-1.5 rounded text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <AddWaitlistDialog open={showAdd} onOpenChange={setShowAdd} onAdded={() => load(page, status)} />
    </div>
  );
}
