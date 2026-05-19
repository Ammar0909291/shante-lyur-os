'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, UserPlus, Mail, Phone, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-fetch';
import { formatDate } from '@/lib/utils';

interface ClientItem {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  totalVisits: number;
  totalSpent: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  churnRiskScore?: number | null;
  lastVisitAt?: string | null;
  createdAt: string;
  tags: Array<{ tag: string; color: string | null }>;
}

const TIER_STYLES: Record<string, { label: string; className: string }> = {
  PLATINUM: { label: 'Platinum',  className: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' },
  GOLD:     { label: 'Gold',      className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  SILVER:   { label: 'Silver',    className: 'bg-slate-400/20 text-slate-300 border border-slate-400/30' },
  BRONZE:   { label: 'Bronze',    className: 'bg-orange-800/20 text-orange-300 border border-orange-800/30' },
};

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.BRONZE;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

function ClientCard({ client }: { client: ClientItem }) {
  const name = `${client.firstName} ${client.lastName}`;
  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center gap-4 px-6 py-4 border-b border-border-luxury last:border-0 hover:bg-charcoal/30 transition-colors group"
    >
      <Avatar name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-text-primary text-sm truncate">{name}</p>
          <TierBadge tier={client.loyaltyTier} />
          {client.tags.map(t => (
            <span
              key={t.tag}
              className="px-2 py-0.5 rounded-full text-[10px] border border-border-luxury text-text-tertiary"
              style={t.color ? { borderColor: `${t.color}50`, color: t.color } : {}}
            >
              {t.tag}
            </span>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Mail className="w-3 h-3" aria-hidden />
            {client.email}
          </span>
          {client.phone && (
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <Phone className="w-3 h-3" aria-hidden />
              {client.phone}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Calendar className="w-3 h-3" aria-hidden />
            {client.lastVisitAt
              ? `Последний визит: ${formatDate(new Date(client.lastVisitAt))}`
              : `С нами с ${formatDate(new Date(client.createdAt))}`}
          </span>
          {client.totalVisits > 0 && (
            <span className="text-xs text-text-tertiary">{client.totalVisits} визитов</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
    </Link>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = React.useState<ClientItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const LIMIT = 50;

  async function load(p = 1, q = search) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (q.trim()) params.set('search', q.trim());
      const res = await apiFetch(`/api/customers?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Не удалось загрузить клиентов');
        return;
      }
      const items = (json.data?.items ?? json.data ?? []) as ClientItem[];
      setClients(items);
      setTotal(json.data?.total ?? items.length);
      setPage(p);
    } catch {
      setError('Не удалось загрузить клиентов');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced server-side search
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(q: string) {
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, q), 350);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Клиенты</h2>
          <p className="text-text-secondary mt-1 text-sm">
            База клиентов студии
            {!loading && total > 0 && (
              <span className="text-text-tertiary ml-2">· {total} клиентов</span>
            )}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Добавить клиента
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Поиск по имени, email или телефону..."
        value={search}
        onChange={e => handleSearchChange(e.target.value)}
        leftAddon={<Search className="w-4 h-4" />}
      />

      {/* List */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">Загрузка...</div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-text-secondary text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => load()}>Повторить</Button>
          </div>
        )}
        {!loading && !error && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-text-primary font-medium">
              {search ? 'Ничего не найдено' : 'Клиенты не найдены'}
            </p>
            <p className="text-text-tertiary text-sm">
              {search ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первого клиента'}
            </p>
          </div>
        )}
        {!loading && !error && clients.length > 0 && (
          <div>
            {clients.map(c => <ClientCard key={c.id} client={c} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
          >
            ← Назад
          </Button>
          <span className="text-sm text-text-secondary px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  );
}
