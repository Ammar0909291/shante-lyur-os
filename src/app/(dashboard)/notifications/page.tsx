'use client';

import React from 'react';
import { Bell, CheckCheck, Calendar, CreditCard, Tag, Info, AlertTriangle, Key, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id:          string;
  type:        string;
  channel:     string;
  status:      string;
  title:       string;
  body:        string;
  data:        Record<string, unknown> | null;
  sentAt:      string | null;
  readAt:      string | null;
  createdAt:   string;
  appointment: { id: string; startAt: string } | null;
}

interface NotificationPage {
  items:       Notification[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  unreadCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: '',                      label: 'Все'          },
  { value: 'APPOINTMENT_CONFIRMED', label: 'Записи'       },
  { value: 'PAYMENT_RECEIVED',      label: 'Платежи'      },
  { value: 'APPOINTMENT_REMINDER',  label: 'Напоминания'  },
  { value: 'SYSTEM',                label: 'Система'      },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]['value'];

const TYPE_ICON: Record<string, React.ElementType> = {
  APPOINTMENT_CONFIRMED:   Calendar,
  APPOINTMENT_REMINDER:    Calendar,
  APPOINTMENT_CANCELLED:   Calendar,
  APPOINTMENT_RESCHEDULED: Calendar,
  PAYMENT_RECEIVED:        CreditCard,
  PAYMENT_FAILED:          CreditCard,
  PROMO_CODE:              Tag,
  WELCOME:                 UserCheck,
  PASSWORD_RESET:          Key,
  SYSTEM:                  Info,
};

const TYPE_COLOR: Record<string, string> = {
  APPOINTMENT_CONFIRMED:   'text-emerald-400 bg-emerald-500/15',
  APPOINTMENT_REMINDER:    'text-amber-400 bg-amber-500/15',
  APPOINTMENT_CANCELLED:   'text-red-400 bg-red-500/15',
  APPOINTMENT_RESCHEDULED: 'text-blue-400 bg-blue-500/15',
  PAYMENT_RECEIVED:        'text-champagne bg-champagne/15',
  PAYMENT_FAILED:          'text-red-400 bg-red-500/15',
  PROMO_CODE:              'text-purple-400 bg-purple-500/15',
  WELCOME:                 'text-emerald-400 bg-emerald-500/15',
  PASSWORD_RESET:          'text-amber-400 bg-amber-500/15',
  SYSTEM:                  'text-text-muted bg-border-luxury',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'только что';
  if (m < 60)  return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'вчера';
  if (d < 30)  return `${d} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function isUnread(n: Notification): boolean {
  return !['READ', 'FAILED'].includes(n.status);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [data,       setData]       = React.useState<NotificationPage | null>(null);
  const [loading,    setLoading]    = React.useState(true);
  const [page,       setPage]       = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('');
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [marking,    setMarking]    = React.useState(false);

  const load = React.useCallback(async (p: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page:  String(p),
        limit: '25',
        ...(unreadOnly ? { unreadOnly: 'true' } : {}),
      });
      const res  = await fetch(`/api/v1/notifications?${qs}`);
      const json = await res.json();
      if (json.success) setData(json.data as NotificationPage);
    } catch { /* keep stale */ } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  React.useEffect(() => { setPage(1); void load(1); }, [load]);

  async function markOneRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
    setData((prev) => prev ? {
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
      items: prev.items.map((n) => n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n),
    } : prev);
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'POST' });
      setData((prev) => prev ? {
        ...prev,
        unreadCount: 0,
        items: prev.items.map((n) => ({ ...n, status: 'READ', readAt: n.readAt ?? new Date().toISOString() })),
      } : prev);
    } finally {
      setMarking(false);
    }
  }

  // Client-side type filter (no refetch — filter over loaded page)
  const filtered = React.useMemo(() => {
    if (!data) return [];
    if (!typeFilter) return data.items;
    return data.items.filter((n) => n.type === typeFilter || n.type.startsWith(typeFilter.replace('_CONFIRMED', '')));
  }, [data, typeFilter]);

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Уведомления</h1>
            {data && data.unreadCount > 0 && (
              <p className="text-sm text-text-muted mt-0.5">{data.unreadCount} непрочитанных</p>
            )}
          </div>
          {data && data.unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={marking}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-charcoal border border-border-luxury hover:border-border-light text-text-secondary hover:text-text-primary transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {marking ? 'Обновляю…' : 'Прочитать все'}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type tabs */}
          <div className="flex gap-1 bg-charcoal/60 border border-border-luxury rounded-lg p-0.5">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  typeFilter === f.value
                    ? 'bg-charcoal text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              unreadOnly
                ? 'bg-champagne/10 border-champagne/40 text-champagne'
                : 'bg-charcoal border-border-luxury text-text-muted hover:text-text-secondary',
            )}
          >
            Только непрочитанные
          </button>
        </div>

        {/* List */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">
          {loading && (
            <div className="divide-y divide-border-luxury/40">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-4">
                  <div className="w-8 h-8 rounded-lg bg-border-luxury animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-border-luxury rounded animate-pulse" />
                    <div className="h-3 w-64 bg-border-luxury/60 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-8 h-8 text-text-muted mb-3" />
              <p className="text-sm text-text-primary font-medium">Уведомлений нет</p>
              <p className="text-xs text-text-muted mt-1">
                {unreadOnly ? 'Все уведомления прочитаны' : 'Здесь появятся уведомления о записях и платежах'}
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-border-luxury/40">
              {filtered.map((n) => {
                const Icon   = TYPE_ICON[n.type] ?? AlertTriangle;
                const colors = TYPE_COLOR[n.type] ?? 'text-text-muted bg-border-luxury';
                const unread = isUnread(n);

                return (
                  <div
                    key={n.id}
                    onClick={() => { if (unread) void markOneRead(n.id); }}
                    className={cn(
                      'flex items-start gap-3 px-4 py-4 transition-colors',
                      unread ? 'bg-champagne/[0.025] hover:bg-champagne/[0.04] cursor-pointer' : 'hover:bg-charcoal/40',
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', colors)}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium leading-snug', unread ? 'text-text-primary' : 'text-text-secondary')}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {unread && (
                            <span className="w-2 h-2 rounded-full bg-champagne shrink-0" />
                          )}
                          <span className="text-[11px] text-text-muted">{relativeTime(n.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{n.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-luxury/40 bg-obsidian/20">
              <p className="text-xs text-text-muted">
                Стр. {data.page} из {data.totalPages} · {data.total} всего
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); void load(p); }}
                  className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => { const p = page + 1; setPage(p); void load(p); }}
                  className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
