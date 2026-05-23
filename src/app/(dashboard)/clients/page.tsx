'use client';

import * as React from 'react';
import {
  Users,
  UserPlus,
  Crown,
  TrendingUp,
  Search,
  Eye,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
type FilterKey = 'all' | 'vip' | 'active' | 'at-risk';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyTier: LoyaltyTier;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  riskFlag?: boolean;
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'Анна Соколова',    email: 'anna@example.com',     phone: '+7 999 111 22 33', loyaltyTier: 'GOLD',     visits: 24, totalSpent: 28_800_000, lastVisit: '2026-05-20' },
  { id: '2', name: 'Елена Морозова',   email: 'elena@example.com',    phone: '+7 999 222 33 44', loyaltyTier: 'PLATINUM', visits: 48, totalSpent: 62_400_000, lastVisit: '2026-05-22' },
  { id: '3', name: 'Светлана Ким',     email: 'svetlana@example.com', phone: '+7 999 333 44 55', loyaltyTier: 'SILVER',   visits: 12, totalSpent: 14_400_000, lastVisit: '2026-05-18' },
  { id: '4', name: 'Ирина Волкова',    email: 'irina@example.com',    phone: '+7 999 444 55 66', loyaltyTier: 'BRONZE',   visits:  3, totalSpent:  3_600_000, lastVisit: '2026-05-10', riskFlag: true },
  { id: '5', name: 'Татьяна Лебедева', email: 'tatyana@example.com',  phone: '+7 999 555 66 77', loyaltyTier: 'GOLD',     visits: 18, totalSpent: 21_600_000, lastVisit: '2026-05-21' },
  { id: '6', name: 'Наталья Попова',   email: 'natalia@example.com',  phone: '+7 999 666 77 88', loyaltyTier: 'PLATINUM', visits: 36, totalSpent: 46_800_000, lastVisit: '2026-05-23' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTierBadgeVariant(tier: LoyaltyTier) {
  const map: Record<LoyaltyTier, 'bronze' | 'silver' | 'gold' | 'platinum'> = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
  };
  return map[tier];
}

function getTierLabel(tier: LoyaltyTier) {
  const map: Record<LoyaltyTier, string> = {
    BRONZE: 'Бронза',
    SILVER: 'Серебро',
    GOLD: 'Золото',
    PLATINUM: 'Платина',
  };
  return map[tier];
}

function isAtRisk(client: Client): boolean {
  if (client.riskFlag) return true;
  const last = new Date(client.lastVisit);
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 45 || client.visits <= 2;
}

function isVip(client: Client): boolean {
  return client.loyaltyTier === 'PLATINUM' || client.loyaltyTier === 'GOLD';
}

function isActive(client: Client): boolean {
  const last = new Date(client.lastVisit);
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-charcoal animate-shimmer shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-charcoal rounded animate-shimmer" />
            <div className="h-3 w-36 bg-charcoal rounded animate-shimmer" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><div className="h-3.5 w-32 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-5 w-20 bg-charcoal rounded-full animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-3.5 w-10 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-3.5 w-24 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-3.5 w-24 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-6 py-4 text-right"><div className="h-8 w-16 bg-charcoal rounded-lg animate-shimmer ml-auto" /></td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="px-4 py-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-charcoal animate-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 bg-charcoal rounded animate-shimmer" />
        <div className="h-3 w-48 bg-charcoal rounded animate-shimmer" />
        <div className="h-3 w-28 bg-charcoal rounded animate-shimmer" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  useLocale(); // locale context available for future i18n use

  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<FilterKey>('all');

  // Fetch clients on mount; fall back to mock data on error or empty result
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/customers')
      .then(async (res) => {
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (cancelled) return;
        const items: Client[] = Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data)
            ? json.data
            : [];
        setClients(items.length > 0 ? items : MOCK_CLIENTS);
      })
      .catch(() => {
        if (!cancelled) setClients(MOCK_CLIENTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalClients = clients.length;
  const newThisMonth = clients.filter((c) => {
    const last = new Date(c.lastVisit);
    const now = new Date();
    return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear() && c.visits <= 3;
  }).length;
  const vipCount = clients.filter(isVip).length;
  const avgSpend = clients.length > 0
    ? Math.round(clients.reduce((sum, c) => sum + (c.visits > 0 ? c.totalSpent / c.visits : 0), 0) / clients.length)
    : 0;

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let list = clients;

    if (filter === 'vip') list = list.filter(isVip);
    else if (filter === 'active') list = list.filter(isActive);
    else if (filter === 'at-risk') list = list.filter(isAtRisk);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }

    return list;
  }, [clients, filter, search]);

  const filterPills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `Все (${clients.length})` },
    { key: 'vip', label: 'VIP' },
    { key: 'active', label: 'Активные' },
    { key: 'at-risk', label: 'Под риском' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Клиенты
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Управление клиентской базой и программой лояльности
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Добавить клиента
        </Button>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Всего клиентов"
          value={loading ? '—' : totalClients}
          subtitle="в базе"
          loading={loading}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 5, positive: true, label: 'vs пред. месяц' }}
        />
        <StatCard
          title="Новые в этом месяце"
          value={loading ? '—' : newThisMonth}
          subtitle="первые визиты"
          loading={loading}
          icon={<UserPlus className="w-5 h-5" />}
          trend={{ value: 12, positive: true, label: 'vs пред. месяц' }}
        />
        <StatCard
          title="VIP-клиенты"
          value={loading ? '—' : vipCount}
          subtitle="золото и платина"
          loading={loading}
          icon={<Crown className="w-5 h-5" />}
          trend={{ value: 3, positive: true, label: 'vs пред. месяц' }}
        />
        <StatCard
          title="Средний чек на визит"
          value={loading ? '—' : formatCurrency(avgSpend)}
          subtitle="по всем клиентам"
          loading={loading}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: 8, positive: true, label: 'vs пред. месяц' }}
        />
      </div>

      {/* ── Search + filters ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону…"
            className={cn(
              'w-full h-10 pl-9 pr-4 rounded-lg text-sm',
              'bg-onyx border border-border-luxury',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20',
              'transition-colors duration-200',
            )}
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={cn(
                'px-3 h-9 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200',
                filter === pill.key
                  ? 'bg-champagne text-obsidian shadow-champagne-sm'
                  : 'bg-onyx border border-border-luxury text-text-secondary hover:border-border-light hover:text-text-primary',
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            {filter === 'all' && 'Все клиенты'}
            {filter === 'vip' && 'VIP-клиенты'}
            {filter === 'active' && 'Активные клиенты'}
            {filter === 'at-risk' && 'Клиенты под риском'}
          </h3>
          {!loading && (
            <span className="text-xs text-text-tertiary font-medium">
              {filtered.length} {filtered.length === 1 ? 'клиент' : filtered.length >= 2 && filtered.length <= 4 ? 'клиента' : 'клиентов'}
            </span>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Телефон
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Уровень
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Визиты
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Потрачено
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Последний визит
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? null
                  : filtered.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-charcoal/50 transition-colors group"
                    >
                      {/* Client */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.name} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary whitespace-nowrap">
                                {client.name}
                              </span>
                              {isAtRisk(client) && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-label="Под риском" />
                              )}
                            </div>
                            <span className="text-xs text-text-tertiary block truncate max-w-[180px]">
                              {client.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Phone */}
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">
                        {client.phone}
                      </td>
                      {/* Loyalty tier */}
                      <td className="px-4 py-4">
                        <Badge variant={getTierBadgeVariant(client.loyaltyTier)} dot>
                          {getTierLabel(client.loyaltyTier)}
                        </Badge>
                      </td>
                      {/* Visits */}
                      <td className="px-4 py-4 text-text-primary font-medium tabular-nums">
                        {client.visits}
                      </td>
                      {/* Total spent */}
                      <td className="px-4 py-4 text-champagne font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(client.totalSpent)}
                      </td>
                      {/* Last visit */}
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                        {formatDate(client.lastVisit)}
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {/* navigate to /clients/[id] */}}
                        >
                          Открыть
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-champagne/8 flex items-center justify-center">
                <Plus className="w-6 h-6 text-champagne" />
              </div>
              <div>
                <p className="font-medium text-text-primary text-base">
                  {search ? 'Клиенты не найдены' : 'Нет клиентов в этой категории'}
                </p>
                <p className="text-sm text-text-tertiary mt-1">
                  {search
                    ? `Нет совпадений для «${search}»`
                    : 'Добавьте первого клиента, чтобы начать'}
                </p>
              </div>
              {!search && (
                <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                  Добавить клиента
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border-luxury">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                  <Plus className="w-8 h-8 text-champagne/50" />
                  <p className="text-text-secondary text-sm">
                    {search ? `Нет совпадений для «${search}»` : 'Нет клиентов в этой категории'}
                  </p>
                </div>
              )
              : filtered.map((client) => (
                <div key={client.id} className="px-4 py-4 flex items-start gap-3">
                  <Avatar name={client.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-text-primary text-sm block">
                          {client.name}
                        </span>
                        <span className="text-xs text-text-tertiary block truncate max-w-[200px]">
                          {client.email}
                        </span>
                      </div>
                      <Badge variant={getTierBadgeVariant(client.loyaltyTier)}>
                        {getTierLabel(client.loyaltyTier)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-text-tertiary">{client.phone}</span>
                      <span className="text-xs text-text-tertiary">·</span>
                      <span className="text-xs text-text-tertiary">{client.visits} визитов</span>
                      <span className="text-xs font-semibold text-champagne ml-auto">
                        {formatCurrency(client.totalSpent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-text-tertiary">
                        Последний визит: {formatDate(client.lastVisit)}
                      </span>
                      {isAtRisk(client) && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Под риском
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
