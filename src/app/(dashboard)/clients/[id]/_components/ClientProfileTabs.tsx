'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getClientRole } from '@/lib/client-auth';
import type {
  ClientBookingHistoryResponse,
  ClientTreatmentResponse,
  ClientTransactionResponse,
} from '@/modules/crm/domain/client.dto';

// ─── Types passed from the server page ───────────────────────────────────────

export interface OverviewData {
  clientId: string;
  upcomingBookings: {
    id: string; startAt: string; endAt: string; status: string;
    specialistName: string; serviceName: string; locationName: string; totalPrice: number;
  }[];
  recentVisits: {
    id: string; startAt: string; status: string;
    specialistName: string; serviceName: string; totalPrice: number;
  }[];
  latestNote: { content: string; specialistName: string; createdAt: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(iso: string, short = false) {
  const opts: Intl.DateTimeFormatOptions = short
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(iso).toLocaleDateString('ru-RU', opts);
}

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: T };

function useApiTab<T>(active: boolean, url: string) {
  const [state, setState] = React.useState<LoadState<T>>({ status: 'idle' });

  React.useEffect(() => {
    if (!active) return;
    if (state.status !== 'idle') return;

    setState({ status: 'loading' });
    fetch(url)
      .then(async (r) => {
        const j = await r.json() as { success: boolean; data?: T; error?: { message: string } };
        if (!j.success || !j.data) setState({ status: 'error', message: j.error?.message ?? 'Ошибка загрузки' });
        else setState({ status: 'ok', data: j.data });
      })
      .catch((e: unknown) => setState({ status: 'error', message: e instanceof Error ? e.message : 'Ошибка сети' }));
  }, [active, url, state.status]);

  return state;
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'bookings' | 'treatments' | 'financial' | 'notes' | 'communication';

interface TabDef { id: Tab; label: string; managerOnly?: boolean }

const TABS: TabDef[] = [
  { id: 'overview',       label: 'Обзор' },
  { id: 'bookings',       label: 'Записи' },
  { id: 'treatments',     label: 'Процедуры' },
  { id: 'financial',      label: 'Финансы', managerOnly: true },
  { id: 'notes',          label: 'Заметки' },
  { id: 'communication',  label: 'Коммуникации' },
];

const FINANCIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientProfileTabs({ clientId, overview }: { clientId: string; overview: OverviewData }) {
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');
  const role = getClientRole();
  const canSeeFinancial = FINANCIAL_ROLES.includes(role);

  const visibleTabs = TABS.filter((t) => !t.managerOnly || canSeeFinancial);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border-luxury mb-6 pb-0">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === t.id
                ? 'border-champagne text-champagne'
                : 'border-transparent text-muted hover:text-pearl hover:border-white/20',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'overview' && <OverviewTab overview={overview} />}
      {activeTab === 'bookings' && <BookingsTab clientId={clientId} />}
      {activeTab === 'treatments' && <TreatmentsTab clientId={clientId} />}
      {activeTab === 'financial' && canSeeFinancial && <FinancialTab clientId={clientId} />}
      {activeTab === 'notes' && <NotesTab clientId={clientId} />}
      {activeTab === 'communication' && <CommunicationTab />}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ overview }: { overview: OverviewData }) {
  return (
    <div className="space-y-6">
      {/* Upcoming bookings */}
      {overview.upcomingBookings.length > 0 && (
        <Section title="Предстоящие записи">
          <div className="space-y-2">
            {overview.upcomingBookings.map((b) => (
              <div key={b.id} className="bg-obsidian rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pearl">{b.serviceName}</p>
                  <p className="text-xs text-muted">{b.specialistName} · {fmtDate(b.startAt)}</p>
                  <p className="text-xs text-muted">{b.locationName}</p>
                </div>
                <div className="text-sm font-semibold text-champagne shrink-0">{fmt(b.totalPrice)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent visits */}
      {overview.recentVisits.length > 0 && (
        <Section title="Последние визиты">
          <div className="space-y-2">
            {overview.recentVisits.map((v) => (
              <div key={v.id} className="bg-obsidian rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pearl">{v.serviceName}</p>
                  <p className="text-xs text-muted">{v.specialistName} · {fmtDate(v.startAt)}</p>
                </div>
                <div className="text-sm font-semibold text-champagne shrink-0">{fmt(v.totalPrice)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Latest note */}
      {overview.latestNote && (
        <Section title="Последняя заметка">
          <div className="bg-obsidian rounded-xl p-4">
            <p className="text-sm text-pearl whitespace-pre-wrap">{overview.latestNote.content}</p>
            <p className="text-xs text-muted mt-2">
              {overview.latestNote.specialistName} · {fmtDate(overview.latestNote.createdAt)}
            </p>
          </div>
        </Section>
      )}

      {overview.upcomingBookings.length === 0 && overview.recentVisits.length === 0 && !overview.latestNote && (
        <EmptyState text="Данных для отображения нет" />
      )}
    </div>
  );
}

// ─── Bookings tab ─────────────────────────────────────────────────────────────

function BookingsTab({ clientId }: { clientId: string }) {
  const state = useApiTab<ClientBookingHistoryResponse>(true, `/api/v1/clients/${clientId}/bookings?limit=50`);

  if (state.status === 'loading' || state.status === 'idle') return <Spinner />;
  if (state.status === 'error') return <ErrorMsg msg={state.message} />;

  const { items } = state.data;
  if (!items.length) return <EmptyState text="Записей нет" />;

  return (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b.id} className="bg-obsidian rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5 mb-1">
                {b.services.map((s) => (
                  <span key={s.id} className="text-sm text-pearl font-medium">{s.name}</span>
                ))}
              </div>
              <p className="text-xs text-muted">{b.specialistName} · {b.locationName}</p>
              <p className="text-xs text-muted">{fmtDate(b.startAt)} · {b.totalDuration} мин</p>
            </div>
            <div className="text-right shrink-0">
              <StatusDot status={b.status} />
              <p className="text-sm font-semibold text-champagne mt-1">{fmt(b.totalPrice)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Treatments tab ───────────────────────────────────────────────────────────

function TreatmentsTab({ clientId }: { clientId: string }) {
  const state = useApiTab<ClientTreatmentResponse>(true, `/api/v1/clients/${clientId}/treatments?limit=50`);

  if (state.status === 'loading' || state.status === 'idle') return <Spinner />;
  if (state.status === 'error') return <ErrorMsg msg={state.message} />;

  const { items } = state.data;
  if (!items.length) return <EmptyState text="Записей о процедурах нет" />;

  return (
    <div className="space-y-4">
      {items.map((t) => (
        <div key={t.id} className="bg-obsidian rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-pearl">{t.serviceName || 'Процедура'}</p>
              <p className="text-xs text-muted">{fmtDate(t.performedAt)}</p>
            </div>
            {t.followUpRequired && t.followUpDate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/30 shrink-0">
                Контроль: {fmtDate(t.followUpDate, true)}
              </span>
            )}
          </div>
          {t.results && (
            <div>
              <p className="text-xs text-champagne/60 uppercase tracking-wider">Результат</p>
              <p className="text-xs text-muted mt-0.5">{t.results}</p>
            </div>
          )}
          {t.sideEffects && (
            <div>
              <p className="text-xs text-amber-500/60 uppercase tracking-wider">Побочные эффекты</p>
              <p className="text-xs text-muted mt-0.5">{t.sideEffects}</p>
            </div>
          )}
          {t.clientFeedback && (
            <div>
              <p className="text-xs text-blue-400/60 uppercase tracking-wider">Отзыв клиента</p>
              <p className="text-xs text-muted mt-0.5">{t.clientFeedback}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Financial tab ────────────────────────────────────────────────────────────

function FinancialTab({ clientId }: { clientId: string }) {
  const state = useApiTab<ClientTransactionResponse>(true, `/api/v1/clients/${clientId}/transactions?limit=50`);

  if (state.status === 'loading' || state.status === 'idle') return <Spinner />;
  if (state.status === 'error') return <ErrorMsg msg={state.message} />;

  const d = state.data;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Оплачено', value: fmt(d.totalPaid) },
          { label: 'Возвраты', value: fmt(d.totalRefunded) },
          { label: 'Задолженность', value: fmt(d.outstandingBalance) },
          { label: 'Предоплата', value: fmt(d.prepaidBalance) },
        ].map((s) => (
          <div key={s.label} className="bg-obsidian rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-base font-semibold text-pearl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      {d.items.length === 0 ? (
        <EmptyState text="Транзакций нет" />
      ) : (
        <div className="space-y-2">
          {d.items.map((t) => (
            <div key={t.id} className="bg-obsidian rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-pearl">{t.description}</p>
                <p className="text-xs text-muted">{fmtDate(t.date)} · {t.type}</p>
              </div>
              <p className={cn('text-sm font-semibold shrink-0 tabular-nums', t.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notes tab ────────────────────────────────────────────────────────────────

function NotesTab({ clientId }: { clientId: string }) {
  const [content, setContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notes, setNotes] = React.useState<{ id: string; content: string; authorName: string; createdAt: string }[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      const json = await res.json() as { success: boolean; data?: { id: string; content: string; authorName: string; createdAt: string }; error?: { message: string } };
      if (!json.success || !json.data) throw new Error(json.error?.message ?? 'Ошибка');
      setNotes((prev) => [json.data!, ...prev]);
      setContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void handleSubmit(e)} className="bg-obsidian rounded-xl p-4 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Добавить заметку о клиенте…"
          rows={3}
          className="w-full bg-transparent text-sm text-pearl placeholder-muted resize-none outline-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="px-4 py-1.5 rounded-lg bg-champagne/20 hover:bg-champagne/30 text-champagne text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      {notes.length === 0 && <EmptyState text="Заметок нет" />}

      {notes.map((n) => (
        <div key={n.id} className="bg-obsidian rounded-xl p-4">
          <p className="text-sm text-pearl whitespace-pre-wrap">{n.content}</p>
          <p className="text-xs text-muted mt-2">{n.authorName} · {fmtDate(n.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Communication tab ────────────────────────────────────────────────────────

function CommunicationTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <p className="text-sm font-medium text-pearl">Коммуникации</p>
      <p className="text-xs text-muted max-w-xs">
        История SMS, email и push-уведомлений появится здесь в следующем обновлении.
      </p>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-champagne/70 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-red-400">{msg}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидание',
  CONFIRMED: 'Подтверждено',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
  NO_SHOW: 'Неявка',
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-blue-400',
  IN_PROGRESS: 'bg-indigo-400',
  COMPLETED: 'bg-emerald-400',
  CANCELLED: 'bg-red-400',
  NO_SHOW: 'bg-stone-400',
};

function StatusDot({ status }: { status: string }) {
  const color = BOOKING_STATUS_COLORS[status] ?? 'bg-stone-400';
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
      {label}
    </span>
  );
}
