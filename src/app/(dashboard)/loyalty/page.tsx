'use client';

import React from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoyaltyOverview {
  tierCounts: Record<string, number>;
  totalClients: number;
  totalPointsDistributed: number;
  avgPoints: number;
}

interface LoyaltyClient {
  userId:        string;
  firstName:     string;
  lastName:      string;
  phone:         string | null;
  loyaltyTier:   string;
  loyaltyPoints: number;
  totalVisits:   number;
  totalSpent:    number;
  lastVisitAt:   string | null;
}

interface ClientsPage {
  items:      LoyaltyClient[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

type TierFilter = '' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: { value: TierFilter; label: string; border: string; text: string }[] = [
  { value: '',         label: 'Все',      border: 'border-border-luxury', text: 'text-text-secondary' },
  { value: 'BRONZE',   label: 'Bronze',   border: 'border-amber-800',     text: 'text-amber-700'      },
  { value: 'SILVER',   label: 'Silver',   border: 'border-slate-400',     text: 'text-slate-300'      },
  { value: 'GOLD',     label: 'Gold',     border: 'border-yellow-500',    text: 'text-yellow-400'     },
  { value: 'PLATINUM', label: 'Platinum', border: 'border-cyan-500',      text: 'text-cyan-300'       },
  { value: 'VIP',      label: 'VIP',      border: 'border-purple-500',    text: 'text-purple-400'     },
];

const TIER_BADGE: Record<string, string> = {
  BRONZE:   'border-amber-800/60 text-amber-700 bg-amber-800/10',
  SILVER:   'border-slate-400/60 text-slate-300 bg-slate-400/10',
  GOLD:     'border-yellow-500/60 text-yellow-400 bg-yellow-500/10',
  PLATINUM: 'border-cyan-500/60 text-cyan-300 bg-cyan-500/10',
  VIP:      'border-purple-500/60 text-purple-400 bg-purple-500/10',
};

// ─── Points Modal ─────────────────────────────────────────────────────────────

interface PointsModalProps {
  client:      LoyaltyClient;
  onClose:     () => void;
  onSaved:     () => void;
}

function PointsModal({ client, onClose, onSaved }: PointsModalProps) {
  const [delta,  setDelta]  = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy,   setBusy]   = React.useState(false);
  const [error,  setError]  = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const d = parseInt(delta, 10);
    if (isNaN(d) || d === 0) { setError('Введите ненулевое целое число'); return; }
    if (!reason.trim())      { setError('Укажите причину'); return; }
    setBusy(true);
    try {
      const res  = await fetch(`/api/v1/loyalty/clients/${client.userId}/points`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ delta: d, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
      onSaved();
      onClose();
    } catch { setError('Ошибка сети'); }
    finally { setBusy(false); }
  }

  const clientName = `${client.firstName} ${client.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-charcoal border border-border-luxury rounded-2xl p-6 space-y-5 shadow-2xl">

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-text-primary">Баллы лояльности</h2>
          <p className="text-sm text-text-secondary">{clientName}</p>
        </div>

        <div className="flex items-center gap-3 bg-obsidian/60 border border-border-luxury rounded-xl px-4 py-3">
          <Award className="w-5 h-5 text-champagne shrink-0" />
          <div>
            <p className="text-lg font-semibold text-text-primary">{client.loyaltyPoints.toLocaleString('ru-RU')} баллов</p>
            <p className={cn('text-xs font-medium', TIER_BADGE[client.loyaltyTier]?.split(' ')[1] ?? 'text-text-muted')}>
              {client.loyaltyTier}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">
              Изменение баллов (+ добавить, − списать)
            </label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="Например: 100 или -50"
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Причина</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Опишите причину изменения…"
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Отмена</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={busy}>Применить</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const [overview,     setOverview]     = React.useState<LoyaltyOverview | null>(null);
  const [data,         setData]         = React.useState<ClientsPage | null>(null);
  const [loading,      setLoading]      = React.useState(true);
  const [page,         setPage]         = React.useState(1);
  const [tierFilter,   setTierFilter]   = React.useState<TierFilter>('');
  const [search,       setSearch]       = React.useState('');
  const [searchInput,  setSearchInput]  = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<LoyaltyClient | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadClients = React.useCallback(async (p: number, tier: TierFilter, q: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: '50' });
      if (tier) qs.set('tier', tier);
      if (q)    qs.set('search', q);
      const res  = await fetch(`/api/v1/loyalty/clients?${qs}`);
      const json = await res.json();
      if (json.success) setData(json.data as ClientsPage);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  const loadOverview = React.useCallback(async () => {
    try {
      const res  = await fetch('/api/v1/loyalty/overview');
      const json = await res.json();
      if (json.success) setOverview(json.data as LoyaltyOverview);
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => { void loadOverview(); }, [loadOverview]);

  React.useEffect(() => {
    setPage(1);
    void loadClients(1, tierFilter, search);
  }, [loadClients, tierFilter, search]);

  function reload() {
    void loadOverview();
    void loadClients(page, tierFilter, search);
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const tierStats = TIERS.filter((t) => t.value !== '');

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Программа лояльности</h1>
          {overview && (
            <p className="text-sm text-text-muted mt-0.5">
              {overview.totalClients} клиентов · {overview.totalPointsDistributed.toLocaleString('ru-RU')} баллов выдано · ср. {overview.avgPoints} баллов
            </p>
          )}
        </div>

        {/* Tier stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tierStats.map((t) => (
            <div
              key={t.value}
              className={cn(
                'bg-charcoal border rounded-xl px-4 py-3 space-y-1',
                t.border,
              )}
            >
              <p className={cn('text-xs font-medium uppercase tracking-wider', t.text)}>{t.label}</p>
              <p className="text-2xl font-semibold text-text-primary">
                {overview ? (overview.tierCounts[t.value as string] ?? 0) : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Search + Tier filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по имени или телефону…"
              className="w-full rounded-lg border border-border-luxury bg-charcoal pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="flex gap-1 bg-charcoal/60 border border-border-luxury rounded-lg p-0.5 w-fit">
            {TIERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTierFilter(t.value)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  tierFilter === t.value
                    ? 'bg-charcoal text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">

          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border-luxury/60 text-xs font-medium text-text-muted uppercase tracking-wider">
            <span>Клиент</span>
            <span>Уровень</span>
            <span>Баллы</span>
            <span>Визиты</span>
            <span>Сумма</span>
            <span>Последний визит</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка…
            </div>
          )}

          {!loading && (!data || data.items.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Award className="w-8 h-8 text-text-muted mb-3" />
              <p className="text-sm text-text-primary font-medium">Клиенты не найдены</p>
              <p className="text-xs text-text-muted mt-1">Попробуйте изменить фильтры или поиск</p>
            </div>
          )}

          {!loading && data && data.items.length > 0 && (
            <div className="divide-y divide-border-luxury/40">
              {data.items.map((client) => (
                <div
                  key={client.userId}
                  onClick={() => setSelectedClient(client)}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 md:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  {/* Client name + phone */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {client.firstName} {client.lastName}
                    </p>
                    {client.phone && (
                      <p className="text-xs text-text-muted mt-0.5">{client.phone}</p>
                    )}
                  </div>

                  {/* Tier badge */}
                  <div className="flex items-center">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
                      TIER_BADGE[client.loyaltyTier] ?? 'bg-charcoal text-text-muted border-border-luxury',
                    )}>
                      {client.loyaltyTier}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="flex items-center">
                    <span className="text-sm text-text-primary font-medium">
                      {client.loyaltyPoints.toLocaleString('ru-RU')}
                    </span>
                  </div>

                  {/* Visits */}
                  <div className="flex items-center">
                    <span className="text-sm text-text-secondary">{client.totalVisits}</span>
                  </div>

                  {/* Spent */}
                  <div className="flex items-center">
                    <span className="text-sm text-text-secondary">{formatCurrency(client.totalSpent)}</span>
                  </div>

                  {/* Last visit */}
                  <div className="flex items-center">
                    <span className="text-sm text-text-muted">{fmtDate(client.lastVisitAt)}</span>
                  </div>
                </div>
              ))}
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
                  onClick={() => { const p = page - 1; setPage(p); void loadClients(p, tierFilter, search); }}
                  className="p-1.5 rounded text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => { const p = page + 1; setPage(p); void loadClients(p, tierFilter, search); }}
                  className="p-1.5 rounded text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {selectedClient && (
        <PointsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
