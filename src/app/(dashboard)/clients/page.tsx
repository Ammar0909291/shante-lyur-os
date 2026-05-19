'use client';

import * as React from 'react';
import { Search, UserPlus, Mail, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-fetch';
import { formatDate } from '@/lib/utils';

interface ClientItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  totalVisits?: number;
  lastVisit?: string | null;
  createdAt: string;
}

function ClientCard({ client }: { client: ClientItem }) {
  const name = `${client.firstName} ${client.lastName}`;
  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-border-luxury last:border-0 hover:bg-charcoal/30 transition-colors">
      <Avatar name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-text-primary text-sm truncate">{name}</p>
          {client.totalVisits != null && (
            <span className="text-xs text-text-tertiary shrink-0">{client.totalVisits} визитов</span>
          )}
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
            {client.lastVisit
              ? `Последний визит: ${formatDate(new Date(client.lastVisit))}`
              : `С нами с ${formatDate(new Date(client.createdAt))}`}
          </span>
        </div>
      </div>
    </div>
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

  async function load(p = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/customers?page=${p}&limit=${LIMIT}`);
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

  const filtered = React.useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q),
    );
  }, [clients, search]);

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
        onChange={e => setSearch(e.target.value)}
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
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-text-primary font-medium">
              {clients.length === 0 ? 'Клиенты не найдены' : 'Ничего не найдено'}
            </p>
            <p className="text-text-tertiary text-sm">
              {clients.length === 0 ? 'Добавьте первого клиента' : 'Попробуйте изменить поисковый запрос'}
            </p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div>
            {filtered.map(c => <ClientCard key={c.id} client={c} />)}
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
