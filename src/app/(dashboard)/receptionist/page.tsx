'use client';

import * as React from 'react';
import {
  RefreshCw, Plus, ClipboardList, DoorOpen,
  UserCheck, UserX, CheckCircle2, XCircle,
  Clock, AlertTriangle, Search,
  CalendarClock, Wifi, WifiOff, RotateCcw,
  ArrowLeftRight, Users, ChevronRight,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import type { TodayOperationsResponse, OperationalAppointment, RoomStatus, OperationalStatus } from '@/types/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
}

function getAuthHeaders(): Record<string, string> {
  try {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (!match) return { 'x-user-id': 'system', 'x-user-role': 'OPERATOR' };
    const p = JSON.parse(atob(match[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; role?: string };
    return { 'x-user-id': p.sub ?? 'system', 'x-user-role': p.role ?? 'OPERATOR' };
  } catch { return { 'x-user-id': 'system', 'x-user-role': 'OPERATOR' }; }
}

const STATUS_COLORS: Partial<Record<OperationalStatus, string>> = {
  PENDING:     'bg-blue-900/40 text-blue-300 border-blue-700/40',
  CONFIRMED:   'bg-champagne/10 text-champagne border-champagne/30',
  ARRIVED:     'bg-teal-900/40 text-teal-300 border-teal-700/40',
  WAITING:     'bg-amber-900/40 text-amber-300 border-amber-700/40',
  IN_PROGRESS: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  COMPLETED:   'bg-green-900/40 text-green-300 border-green-700/40',
  CANCELLED:   'bg-charcoal text-text-tertiary border-border-luxury',
  NO_SHOW:     'bg-red-900/40 text-red-300 border-red-700/40',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OperationalStatus }) {
  const { t } = useLanguage();
  const KEY_MAP: Record<OperationalStatus, string> = {
    PENDING: 'rec.status.pending', CONFIRMED: 'rec.status.confirmed',
    ARRIVED: 'rec.status.arrived', WAITING: 'rec.status.waiting',
    IN_PROGRESS: 'rec.status.active', COMPLETED: 'rec.status.done',
    CANCELLED: 'rec.status.cancelled', NO_SHOW: 'rec.status.noshow',
    RESCHEDULED: 'rec.status.cancelled',
  };
  return (
    <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border', STATUS_COLORS[status] ?? 'bg-charcoal text-text-tertiary border-border-luxury')}>
      {t(KEY_MAP[status] ?? 'rec.status.pending')}
    </span>
  );
}

// ─── Universal Search Bar ─────────────────────────────────────────────────────

interface SearchResult {
  clients: Array<{ id: string; firstName: string; lastName: string; phone: string | null; email: string | null; clientCode: string | null }>;
  specialists: Array<{ id: string; firstName: string; lastName: string; specialization: string | null; status: string }>;
  services: Array<{ id: string; name: string; displayCategory: string | null; baseDuration: number; basePrice: number }>;
  appointments: Array<{ id: string; clientName: string; specialistName: string; startAt: string; status: string; services: string[] }>;
}

function GlobalSearch({ headers }: { headers: Record<string, string> }) {
  const { t } = useLanguage();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  React.useEffect(() => {
    if (query.length < 2) { setResults(null); setOpen(false); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers })
        .then((r) => r.json())
        .then((json: { success: boolean; data?: SearchResult }) => {
          if (json.success && json.data) { setResults(json.data); setOpen(true); }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, headers]);

  const totalResults = results
    ? (results.clients.length + results.specialists.length + results.services.length + results.appointments.length)
    : 0;

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        {loading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary animate-spin" />}
        <input
          className="w-full bg-charcoal border border-border-luxury rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne/50 transition-colors"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results && totalResults > 0) setOpen(true); }}
        />
      </div>

      {open && results && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {totalResults === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-6">{t('search.noResults')}</p>
          ) : (
            <div className="divide-y divide-border-luxury/30">
              {results.clients.length > 0 && (
                <div className="py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 py-1.5">{t('search.clients')}</p>
                  {results.clients.map((c) => (
                    <a
                      key={c.id}
                      href={`/clients/${c.id}`}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-charcoal transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <div>
                        <p className="text-sm text-text-primary font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-text-tertiary">{c.phone ?? c.email ?? ''}</p>
                      </div>
                      {c.clientCode && <span className="text-xs font-mono text-champagne bg-champagne/10 px-1.5 py-0.5 rounded">{c.clientCode}</span>}
                    </a>
                  ))}
                </div>
              )}
              {results.specialists.length > 0 && (
                <div className="py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 py-1.5">{t('search.specialists')}</p>
                  {results.specialists.map((s) => (
                    <a
                      key={s.id}
                      href={`/specialists/${s.id}`}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-charcoal transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <Users className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      <div>
                        <p className="text-sm text-text-primary font-medium">{s.firstName} {s.lastName}</p>
                        {s.specialization && <p className="text-xs text-text-tertiary">{s.specialization}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              )}
              {results.services.length > 0 && (
                <div className="py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 py-1.5">{t('search.services')}</p>
                  {results.services.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-charcoal transition-colors cursor-default">
                      <div>
                        <p className="text-sm text-text-primary font-medium">{s.name}</p>
                        <p className="text-xs text-text-tertiary">{s.displayCategory ?? ''} · {s.baseDuration} мин</p>
                      </div>
                      <span className="text-xs text-champagne font-semibold">{formatCurrency(s.basePrice)}</span>
                    </div>
                  ))}
                </div>
              )}
              {results.appointments.length > 0 && (
                <div className="py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 py-1.5">{t('search.appointments')}</p>
                  {results.appointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-charcoal transition-colors cursor-default">
                      <div>
                        <p className="text-sm text-text-primary font-medium">{a.clientName}</p>
                        <p className="text-xs text-text-tertiary">{fmtTime(a.startAt)} · {a.specialistName}</p>
                        {a.services.length > 0 && <p className="text-xs text-text-tertiary truncate max-w-[180px]">{a.services.join(', ')}</p>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Walk-in Booking Modal ────────────────────────────────────────────────────

interface Service { id: string; name: string; baseDuration: number; basePrice: string | number; category: string }
interface Specialist { id: string; name: string }
interface Room { id: string; name: string; type: string }
interface Client { id: string; firstName: string; lastName: string; phone: string | null; email: string | null }

function WalkinModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useLanguage();
  const headers = getAuthHeaders();

  const [clientQuery, setClientQuery] = React.useState('');
  const [clients, setClients] = React.useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [services, setServices] = React.useState<Service[]>([]);
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [specialistId, setSpecialistId] = React.useState('');
  const [roomId, setRoomId] = React.useState('');
  const [startAt, setStartAt] = React.useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/services', { headers }).then((r) => r.json()),
      fetch('/api/specialists', { headers }).then((r) => r.json()),
      fetch('/api/operations/rooms', { headers }).then((r) => r.json()),
    ]).then(([svcJson, specJson, roomJson]) => {
      if (svcJson.success) setServices((svcJson.data?.services ?? svcJson.data ?? []) as Service[]);
      if (specJson.success) {
        setSpecialists(((specJson.data?.specialists ?? specJson.data ?? []) as Array<{ id: string; user?: { firstName?: string; lastName?: string }; name?: string; firstName?: string; lastName?: string }>).map((s) => ({
          id: s.id,
          name: s.name ?? `${s.firstName ?? s.user?.firstName ?? ''} ${s.lastName ?? s.user?.lastName ?? ''}`.trim(),
        })));
      }
      if (roomJson.success) setRooms((roomJson.data?.rooms ?? roomJson.data ?? []) as Room[]);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (clientQuery.length < 2) { setClients([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/clients/search?q=${encodeURIComponent(clientQuery)}&limit=5`, { headers })
        .then((r) => r.json())
        .then((json) => { if (json.success) setClients((json.data?.clients ?? json.data ?? []) as Client[]); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [clientQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const totalDuration = services.filter((s) => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.baseDuration, 0);
  const totalPrice = services.filter((s) => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + Number(s.basePrice), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedClient) return setError(t('rec.walkin.noClient'));
    if (!selectedServiceIds.length) return setError(t('rec.walkin.noService'));
    if (!startAt) return setError(t('rec.walkin.noTime'));

    setLoading(true);
    try {
      const res = await fetch('/api/operations/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          clientId: selectedClient.id,
          specialistId: specialistId || undefined,
          roomId: roomId || undefined,
          startAt: new Date(startAt).toISOString(),
          serviceIds: selectedServiceIds,
          notes: notes || undefined,
        }),
      });
      const json = await res.json() as { success: boolean; error?: { code?: string; message: string } };
      if (!json.success) {
        setError(json.error?.code === 'CONFLICT' ? t('rec.walkin.conflict') : json.error?.message ?? t('common.error'));
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h2 className="text-lg font-bold text-text-primary font-serif">{t('rec.walkin.title')}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.client')}</label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-charcoal rounded-xl px-3 py-2.5 border border-champagne/30">
                <div>
                  <p className="text-sm font-medium text-text-primary">{selectedClient.firstName} {selectedClient.lastName}</p>
                  {selectedClient.phone && <p className="text-xs text-text-tertiary">{selectedClient.phone}</p>}
                </div>
                <button type="button" onClick={() => setSelectedClient(null)} className="text-text-tertiary hover:text-red-400 transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  className="w-full bg-charcoal border border-border-luxury rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne/50"
                  placeholder={t('rec.walkin.clientSearch')}
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                />
                {clients.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-onyx border border-border-luxury rounded-xl shadow-lg z-10 overflow-hidden">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-charcoal transition-colors border-b border-border-luxury/30 last:border-0"
                        onClick={() => { setSelectedClient(c); setClientQuery(''); setClients([]); }}
                      >
                        <p className="text-sm text-text-primary">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-text-tertiary">{c.phone ?? c.email ?? ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">
              {t('rec.walkin.service')}
              {totalDuration > 0 && <span className="ml-2 text-champagne normal-case">{totalDuration} мин · {formatCurrency(totalPrice)}</span>}
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg text-xs border transition-all',
                    selectedServiceIds.includes(s.id)
                      ? 'bg-champagne/10 border-champagne/40 text-champagne'
                      : 'bg-charcoal border-border-luxury text-text-secondary hover:border-champagne/30',
                  )}
                >
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-[10px] opacity-70">{s.baseDuration} мин</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.specialist')}</label>
              <select
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
                value={specialistId}
                onChange={(e) => setSpecialistId(e.target.value)}
              >
                <option value="">—</option>
                {specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.room')}</label>
              <select
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">—</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.time')}</label>
            <input
              type="datetime-local"
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.notes')}</label>
            <textarea
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne/50 resize-none h-16"
              placeholder="..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-border-luxury shrink-0">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); void submit(e as unknown as React.FormEvent); }}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50"
          >
            {loading ? t('rec.walkin.creating') : t('rec.walkin.create')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rebook Modal ─────────────────────────────────────────────────────────────

function RebookModal({
  sourceApt,
  onClose,
  onCreated,
}: {
  sourceApt: OperationalAppointment;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useLanguage();
  const headers = getAuthHeaders();
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [specialistId, setSpecialistId] = React.useState(sourceApt.specialistId ?? '');
  const [roomId, setRoomId] = React.useState('');
  const [startAt, setStartAt] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/specialists', { headers }).then((r) => r.json()),
      fetch('/api/operations/rooms', { headers }).then((r) => r.json()),
    ]).then(([specJson, roomJson]) => {
      if (specJson.success) {
        setSpecialists(((specJson.data?.specialists ?? specJson.data ?? []) as Array<{ id: string; user?: { firstName?: string; lastName?: string }; name?: string; firstName?: string; lastName?: string }>).map((s) => ({
          id: s.id,
          name: s.name ?? `${s.firstName ?? s.user?.firstName ?? ''} ${s.lastName ?? s.user?.lastName ?? ''}`.trim(),
        })));
      }
      if (roomJson.success) setRooms((roomJson.data?.rooms ?? roomJson.data ?? []) as Room[]);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/operations/rebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          appointmentId: sourceApt.id,
          startAt: new Date(startAt).toISOString(),
          specialistId: specialistId || undefined,
          roomId: roomId || undefined,
        }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onCreated();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text-primary font-serif">{t('rec.rebook.title')}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><XCircle className="w-5 h-5" /></button>
        </div>

        {/* Source appointment info */}
        <div className="bg-charcoal border border-border-luxury rounded-xl px-4 py-3 mb-4 text-xs">
          <p className="text-text-tertiary mb-1">Повторить запись для:</p>
          <p className="text-text-primary font-medium">{sourceApt.clientName}</p>
          <p className="text-text-secondary">{sourceApt.services.join(', ')}</p>
          <p className="text-text-tertiary mt-1">{sourceApt.duration} мин · {formatCurrency(sourceApt.revenue)}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">Дата и время</label>
            <input
              type="datetime-local"
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.specialist')}</label>
              <select
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
                value={specialistId}
                onChange={(e) => setSpecialistId(e.target.value)}
              >
                <option value="">—</option>
                {specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.walkin.room')}</label>
              <select
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">—</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50">
              {loading ? t('rec.rebook.saving') : t('rec.rebook.btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reassign Modal ───────────────────────────────────────────────────────────

function ReassignModal({
  appointment,
  onClose,
  onReassigned,
}: {
  appointment: OperationalAppointment;
  onClose: () => void;
  onReassigned: () => void;
}) {
  const { t } = useLanguage();
  const headers = getAuthHeaders();
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [specialistId, setSpecialistId] = React.useState('');
  const [roomId, setRoomId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/specialists', { headers }).then((r) => r.json()),
      fetch('/api/operations/rooms', { headers }).then((r) => r.json()),
    ]).then(([specJson, roomJson]) => {
      if (specJson.success) {
        setSpecialists(((specJson.data?.specialists ?? specJson.data ?? []) as Array<{ id: string; user?: { firstName?: string; lastName?: string }; name?: string; firstName?: string; lastName?: string }>).map((s) => ({
          id: s.id,
          name: s.name ?? `${s.firstName ?? s.user?.firstName ?? ''} ${s.lastName ?? s.user?.lastName ?? ''}`.trim(),
        })));
      }
      if (roomJson.success) setRooms((roomJson.data?.rooms ?? roomJson.data ?? []) as Room[]);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!specialistId && !roomId) { setError('Выберите специалиста или кабинет'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/operations/appointments/${appointment.id}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          specialistId: specialistId || undefined,
          roomId: roomId || undefined,
        }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onReassigned();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text-primary font-serif">{t('rec.reassign.title')}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="bg-charcoal border border-border-luxury rounded-xl px-4 py-3 mb-4 text-xs">
          <p className="text-text-primary font-medium">{appointment.clientName}</p>
          <p className="text-text-secondary">{appointment.services.join(', ')}</p>
          <p className="text-text-tertiary mt-1">{fmtTime(appointment.startAt)} · {appointment.specialistName}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.reassign.specialist')}</label>
            <select
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
              value={specialistId}
              onChange={(e) => setSpecialistId(e.target.value)}
            >
              <option value="">— {appointment.specialistName}</option>
              {specialists.filter((s) => s.name !== appointment.specialistName).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.reassign.room')}</label>
            <select
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">— {appointment.roomName ?? 'Не назначен'}</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50">
              {loading ? t('rec.reassign.saving') : t('rec.reassign.btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Room Assignment Modal ────────────────────────────────────────────────────

function RoomModal({ appointmentId, onClose, onAssigned }: { appointmentId: string; onClose: () => void; onAssigned: () => void }) {
  const { t } = useLanguage();
  const headers = getAuthHeaders();
  const [rooms, setRooms] = React.useState<(RoomStatus & { id: string; name: string })[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetch('/api/operations/rooms', { headers })
      .then((r) => r.json())
      .then((json) => { if (json.success) setRooms((json.data?.rooms ?? json.data ?? []) as (RoomStatus & { id: string; name: string })[]); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function assign(roomId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/operations/rooms/${roomId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ appointmentId }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onAssigned();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text-primary font-serif">{t('rec.room.title')}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><XCircle className="w-5 h-5" /></button>
        </div>
        {rooms.length === 0
          ? <p className="text-sm text-text-tertiary text-center py-6">{t('rec.room.noRooms')}</p>
          : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => void assign(room.id)}
                  disabled={loading || room.isOccupied}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left',
                    room.isOccupied
                      ? 'bg-charcoal/40 border-border-luxury text-text-tertiary cursor-not-allowed'
                      : 'bg-charcoal border-border-luxury hover:border-champagne/40 hover:bg-charcoal/80',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <DoorOpen className={cn('w-4 h-4', room.isOccupied ? 'text-red-400' : 'text-emerald-400')} />
                    <span className="text-sm font-medium text-text-primary">{room.name}</span>
                    <span className="text-xs text-text-tertiary">{room.type}</span>
                  </div>
                  <span className={cn('text-xs font-medium', room.isOccupied ? 'text-red-400' : 'text-emerald-400')}>
                    {room.isOccupied ? t('rec.room.occupied') : t('rec.room.free')}
                  </span>
                </button>
              ))}
            </div>
          )}
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────

function RescheduleModal({ appointmentId, currentStart, onClose, onRescheduled }: {
  appointmentId: string; currentStart: string; onClose: () => void; onRescheduled: () => void;
}) {
  const { t } = useLanguage();
  const headers = getAuthHeaders();
  const [newTime, setNewTime] = React.useState(new Date(currentStart).toISOString().slice(0, 16));
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTime) return setError(t('rec.walkin.noTime'));
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ newStartAt: new Date(newTime).toISOString(), reason: reason || undefined }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onRescheduled();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text-primary font-serif">{t('rec.reschedule.title')}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><XCircle className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.reschedule.newTime')}</label>
            <input
              type="datetime-local"
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-champagne/50"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">{t('rec.reschedule.reason')}</label>
            <input
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne/50"
              placeholder="..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50">
              {loading ? t('rec.reschedule.saving') : t('rec.reschedule.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppCard({
  apt,
  onAction,
  onAssignRoom,
  onReschedule,
  onRebook,
  onReassign,
}: {
  apt: OperationalAppointment;
  onAction: (id: string, action: string) => Promise<void>;
  onAssignRoom: (id: string) => void;
  onReschedule: (id: string, start: string) => void;
  onRebook: (apt: OperationalAppointment) => void;
  onReassign: (apt: OperationalAppointment) => void;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState<string | null>(null);

  const act = async (action: string) => {
    setPending(action);
    await onAction(apt.id, action);
    setPending(null);
  };

  const isTerminal = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(apt.dbStatus);
  const isDelayed = apt.delayMinutes >= 10;
  const isLongWait = (apt.waitMinutes ?? 0) >= 20;

  return (
    <div className={cn(
      'bg-onyx border rounded-2xl p-4 space-y-3 transition-all',
      apt.operationalStatus === 'ARRIVED' || apt.operationalStatus === 'WAITING'
        ? 'border-teal-700/50 shadow-[0_0_12px_0_rgba(20,184,166,0.08)]'
        : apt.operationalStatus === 'IN_PROGRESS'
          ? 'border-violet-700/50 shadow-[0_0_12px_0_rgba(124,58,237,0.08)]'
          : 'border-border-luxury',
    )}>
      {/* Top row: time + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-center shrink-0">
            <p className="text-base font-bold text-champagne font-mono">{fmtTime(apt.startAt)}</p>
            <p className="text-[10px] text-text-tertiary">{apt.duration} мин</p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-text-primary truncate">{apt.clientName}</p>
              {(apt.waitMinutes ?? 0) > 0 && apt.operationalStatus !== 'IN_PROGRESS' && (
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', isLongWait ? 'bg-red-900/40 text-red-300' : 'bg-amber-900/30 text-amber-300')}>
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />{apt.waitMinutes}м
                </span>
              )}
              {isDelayed && apt.operationalStatus !== 'IN_PROGRESS' && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300">
                  <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />{apt.delayMinutes}м
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary truncate">{apt.services.join(', ')}</p>
            <p className="text-xs text-text-tertiary">{apt.specialistName}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={apt.operationalStatus} />
          {apt.roomName && (
            <span className="text-[10px] text-text-tertiary flex items-center gap-1">
              <DoorOpen className="w-3 h-3" />{apt.roomName}
            </span>
          )}
          {apt.revenue > 0 && (
            <span className="text-[10px] text-champagne font-semibold">{formatCurrency(apt.revenue)}</span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border-luxury/40">
        {!isTerminal && (
          <>
            {(apt.dbStatus === 'PENDING' || apt.dbStatus === 'CONFIRMED') && !apt.checkedInAt && (
              <ActionBtn label={t('rec.checkin')} icon={UserCheck} color="teal" loading={pending === 'checkin'} onClick={() => void act('checkin')} />
            )}
            {apt.operationalStatus === 'WAITING' && (
              <ActionBtn label="Начать" icon={UserCheck} color="violet" loading={pending === 'start'} onClick={() => void act('start')} />
            )}
            {apt.dbStatus === 'IN_PROGRESS' && (
              <ActionBtn label={t('rec.complete')} icon={CheckCircle2} color="green" loading={pending === 'complete'} onClick={() => void act('complete')} />
            )}
            {!apt.roomName && (
              <ActionBtn label={t('rec.assignRoom')} icon={DoorOpen} color="amber" loading={false} onClick={() => onAssignRoom(apt.id)} />
            )}
            {!['IN_PROGRESS', 'COMPLETED'].includes(apt.dbStatus) && (
              <ActionBtn label={t('rec.reschedule')} icon={CalendarClock} color="blue" loading={false} onClick={() => onReschedule(apt.id, apt.startAt)} />
            )}
            <ActionBtn label="Переназн." icon={ArrowLeftRight} color="amber" loading={false} onClick={() => onReassign(apt)} />
            {!['IN_PROGRESS', 'COMPLETED'].includes(apt.dbStatus) && (
              <ActionBtn label={t('rec.noshow')} icon={UserX} color="red" loading={pending === 'noshow'} onClick={() => void act('noshow')} />
            )}
            {apt.dbStatus !== 'IN_PROGRESS' && (
              <ActionBtn label={t('rec.cancel')} icon={XCircle} color="grey" loading={pending === 'cancel'} onClick={() => void act('cancel')} />
            )}
          </>
        )}
        {isTerminal && (
          <ActionBtn label={t('rec.rebook.btn')} icon={RotateCcw} color="blue" loading={false} onClick={() => onRebook(apt)} />
        )}
      </div>
    </div>
  );
}

type BtnColor = 'teal' | 'violet' | 'green' | 'amber' | 'red' | 'blue' | 'grey';

function ActionBtn({ label, icon: Icon, color, loading, onClick }: {
  label: string; icon: React.ElementType; color: BtnColor; loading: boolean; onClick: () => void;
}) {
  const cls: Record<BtnColor, string> = {
    teal: 'bg-teal-900/30 text-teal-300 hover:bg-teal-900/50 border-teal-700/40',
    violet: 'bg-violet-900/30 text-violet-300 hover:bg-violet-900/50 border-violet-700/40',
    green: 'bg-green-900/30 text-green-300 hover:bg-green-900/50 border-green-700/40',
    amber: 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 border-amber-700/40',
    red: 'bg-red-900/30 text-red-300 hover:bg-red-900/50 border-red-700/40',
    blue: 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border-blue-700/40',
    grey: 'bg-charcoal text-text-tertiary hover:bg-charcoal/80 border-border-luxury',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40', cls[color])}
    >
      {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ─── Workload Summary Strip ───────────────────────────────────────────────────

function WorkloadStrip({ data }: { data: TodayOperationsResponse | null }) {
  const { t } = useLanguage();
  if (!data) return null;

  const overloaded = data.specialists.filter((s) => s.liveStatus === 'OVERBOOKED').length;
  const idle = data.specialists.filter((s) => s.liveStatus === 'FREE' && s.todayScheduled === 0).length;
  const freeRooms = data.rooms.filter((r) => !r.isOccupied).length;

  if (overloaded === 0 && idle === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {overloaded > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-700/30 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-semibold">{overloaded}</span>
          <span>{t('rec.workload.overloaded')}</span>
        </div>
      )}
      {idle > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-900/20 border border-amber-700/30 text-xs text-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-semibold">{idle}</span>
          <span>{t('rec.workload.idle')}</span>
        </div>
      )}
      {freeRooms > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-700/30 text-xs text-emerald-300">
          <DoorOpen className="w-3.5 h-3.5" />
          <span className="font-semibold">{freeRooms}</span>
          <span>{t('rec.workload.freeRooms')}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'waiting' | 'arrived' | 'active' | 'done';

const FILTER_STATUSES: Record<FilterKey, OperationalStatus[]> = {
  all: [],
  waiting: ['PENDING', 'CONFIRMED'],
  arrived: ['ARRIVED', 'WAITING'],
  active: ['IN_PROGRESS'],
  done: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
};

export default function ReceptionistPage() {
  const { t } = useLanguage();
  const headers = React.useMemo(() => getAuthHeaders(), []);

  const [data, setData] = React.useState<TodayOperationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [liveConnected, setLiveConnected] = React.useState(false);
  const [showWalkin, setShowWalkin] = React.useState(false);
  const [roomModal, setRoomModal] = React.useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = React.useState<{ id: string; start: string } | null>(null);
  const [rebookTarget, setRebookTarget] = React.useState<OperationalAppointment | null>(null);
  const [reassignTarget, setReassignTarget] = React.useState<OperationalAppointment | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/operations/today', { headers });
      const json = await res.json() as { success: boolean; data?: TodayOperationsResponse };
      if (json.success && json.data) setData(json.data);
    } catch {}
    finally { setLoading(false); }
  }, [headers]);

  React.useEffect(() => {
    void fetchData();

    const es = new EventSource('/api/realtime/ops-stream');
    es.onopen = () => setLiveConnected(true);
    es.onerror = () => setLiveConnected(false);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type?: string };
        if (ev.type && ev.type !== 'connected') void fetchData();
      } catch {}
    };
    return () => es.close();
  }, [fetchData]);

  const queue = data?.queue ?? [];
  const rooms = data?.rooms ?? [];
  const metrics = data?.metrics;

  const filtered = filter === 'all'
    ? queue
    : queue.filter((a) => FILTER_STATUSES[filter].includes(a.operationalStatus));

  const handleAction = React.useCallback(async (id: string, action: string) => {
    try {
      await fetch(`/api/operations/appointments/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action }),
      });
      await fetchData();
    } catch {}
  }, [headers, fetchData]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',     label: t('rec.filter.all') },
    { key: 'waiting', label: t('rec.filter.waiting') },
    { key: 'arrived', label: t('rec.filter.arrived') },
    { key: 'active',  label: t('rec.filter.active') },
    { key: 'done',    label: t('rec.filter.done') },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-champagne animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-serif flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-champagne" />
            {t('rec.title')}
          </h1>
          <p className="text-sm text-text-tertiary mt-0.5">{t('rec.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border', liveConnected ? 'text-emerald-400 border-emerald-700/40 bg-emerald-900/20' : 'text-text-tertiary border-border-luxury bg-charcoal')}>
            {liveConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {t('rec.liveUpdates')}
          </span>
          <button onClick={() => void fetchData()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-luxury text-sm text-text-secondary hover:bg-charcoal hover:text-text-primary transition-colors">
            <RefreshCw className="w-4 h-4" /> {t('rec.refresh')}
          </button>
          <button onClick={() => setShowWalkin(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl luxury-gradient text-obsidian text-sm font-semibold">
            <Plus className="w-4 h-4" /> {t('rec.walkin')}
          </button>
        </div>
      </div>

      {/* Universal Search */}
      <GlobalSearch headers={headers} />

      {/* Workload indicators */}
      <WorkloadStrip data={data} />

      {/* KPI strip */}
      {metrics && (
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: t('rec.filter.waiting'), val: metrics.pending + metrics.confirmed, color: 'text-blue-300' },
            { label: t('rec.filter.arrived'), val: metrics.arrived + metrics.waiting, color: 'text-teal-300' },
            { label: t('rec.filter.active'), val: metrics.inProgress, color: 'text-violet-300' },
            { label: t('rec.filter.done'), val: metrics.completed, color: 'text-green-300' },
            { label: 'Нет явки', val: metrics.noShow, color: 'text-red-300' },
            { label: 'Отменено', val: metrics.cancelled, color: 'text-text-tertiary' },
            { label: 'Ср. ожид.', val: `${metrics.avgWaitMinutes}м`, color: 'text-amber-300' },
            { label: 'Загрузка', val: `${metrics.occupancyRate}%`, color: 'text-champagne' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-onyx border border-border-luxury rounded-xl p-3 text-center">
              <p className={cn('text-lg font-bold font-mono', color)}>{val}</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Queue + Rooms two-column on desktop */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text-primary mr-1">{t('rec.queue')}</p>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  filter === key ? 'luxury-gradient text-obsidian' : 'bg-charcoal text-text-secondary hover:text-text-primary border border-border-luxury',
                )}
              >
                {label}
                {key !== 'all' && <span className="ml-1 opacity-60">{FILTER_STATUSES[key].flatMap((s) => queue.filter((a) => a.operationalStatus === s)).length}</span>}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-10 h-10 text-text-tertiary/40" />
              <p className="text-sm text-text-tertiary">{t('rec.noQueue')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((apt) => (
                <AppCard
                  key={apt.id}
                  apt={apt}
                  onAction={handleAction}
                  onAssignRoom={(id) => setRoomModal(id)}
                  onReschedule={(id, start) => setRescheduleTarget({ id, start })}
                  onRebook={(a) => setRebookTarget(a)}
                  onReassign={(a) => setReassignTarget(a)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Rooms panel */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-text-primary">{t('rec.rooms')}</p>
          {rooms.length === 0 ? (
            <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-10">
              <p className="text-sm text-text-tertiary">{t('rec.room.noRooms')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={cn(
                    'bg-onyx border rounded-xl p-4 transition-all',
                    room.isOccupied ? 'border-violet-700/50' : 'border-border-luxury',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DoorOpen className={cn('w-4 h-4', room.isOccupied ? 'text-violet-400' : 'text-emerald-400')} />
                      <p className="text-sm font-semibold text-text-primary">{room.name}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                      room.isOccupied ? 'bg-violet-900/40 text-violet-300 border-violet-700/40' : 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
                    )}>
                      {room.isOccupied ? t('rec.room.occupied') : t('rec.room.free')}
                    </span>
                  </div>
                  {room.currentAppointment && (
                    <div className="text-xs text-text-secondary space-y-0.5">
                      <p className="font-medium text-text-primary">{room.currentAppointment.clientName}</p>
                      <p>{room.currentAppointment.specialistName}</p>
                      <p className="text-text-tertiary">{fmtTime(room.currentAppointment.startAt)} – {fmtTime(room.currentAppointment.endAt)}</p>
                    </div>
                  )}
                  {!room.isOccupied && room.nextAvailableAt && (
                    <p className="text-xs text-text-tertiary mt-1">
                      <CalendarClock className="w-3 h-3 inline mr-1" />
                      Следующая: {fmtTime(room.nextAvailableAt)}
                    </p>
                  )}
                  <p className="text-[10px] text-text-tertiary mt-1.5">{room.todayBookings} записей сегодня</p>
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {(data?.alerts?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Предупреждения</p>
              {data!.alerts.map((alert) => (
                <div key={alert.id} className={cn(
                  'flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs',
                  alert.severity === 'critical' ? 'bg-red-900/20 border-red-700/40 text-red-300' : 'bg-amber-900/20 border-amber-700/40 text-amber-300',
                )}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showWalkin && <WalkinModal onClose={() => setShowWalkin(false)} onCreated={() => void fetchData()} />}
      {roomModal && <RoomModal appointmentId={roomModal} onClose={() => setRoomModal(null)} onAssigned={() => void fetchData()} />}
      {rescheduleTarget && (
        <RescheduleModal
          appointmentId={rescheduleTarget.id}
          currentStart={rescheduleTarget.start}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={() => void fetchData()}
        />
      )}
      {rebookTarget && (
        <RebookModal
          sourceApt={rebookTarget}
          onClose={() => setRebookTarget(null)}
          onCreated={() => void fetchData()}
        />
      )}
      {reassignTarget && (
        <ReassignModal
          appointment={reassignTarget}
          onClose={() => setReassignTarget(null)}
          onReassigned={() => void fetchData()}
        />
      )}
    </div>
  );
}
