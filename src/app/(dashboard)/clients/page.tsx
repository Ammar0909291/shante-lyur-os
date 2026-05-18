'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt?: string;
  skinType?: string;
  hairType?: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    items: ClientRow[];
    total: number;
  };
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientsPage() {
  const [clients, setClients] = React.useState<ClientRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const limit = 20;

  const fetchClients = React.useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (q) params.set('search', q);
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json() as ApiResponse;
      if (!json.success) throw new Error('Failed to load clients');
      setClients(json.data.items);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchClients(search, page);
  }, [fetchClients, search, page]);

  const handleSearch = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Клиенты</h2>
          <p className="text-text-secondary mt-1 text-sm">{total > 0 ? `${total} клиентов` : 'Загрузка...'}</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Добавить клиента
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Поиск по имени, телефону или email..."
          className={cn(
            'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm',
            'bg-onyx border border-border-luxury',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-champagne/40 focus:border-champagne/40',
          )}
        />
      </div>

      {/* Table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {error ? (
          <div className="flex items-center gap-3 px-6 py-10 text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : loading ? (
          <div className="px-6 py-10 text-center text-text-tertiary text-sm">Загрузка...</div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-text-tertiary">
            <Users className="w-10 h-10 opacity-30" />
            <span className="text-sm">{search ? 'Клиенты не найдены' : 'Клиентов пока нет'}</span>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Телефон</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Тип кожи</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Визиты</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Последний визит</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Всего потрачено</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/clients/${client.id}`} className="flex items-center gap-3 group">
                          <Avatar name={`${client.firstName} ${client.lastName}`} size="sm" />
                          <div>
                            <span className="font-medium text-text-primary group-hover:text-champagne transition-colors">
                              {client.firstName} {client.lastName}
                            </span>
                            {client.email && (
                              <p className="text-xs text-text-tertiary">{client.email}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">{client.phone ?? '—'}</td>
                      <td className="px-4 py-4">
                        {client.skinType ? (
                          <Badge variant="default">{client.skinType}</Badge>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-text-secondary tabular-nums">{client.totalVisits}</td>
                      <td className="px-4 py-4 text-text-secondary">{formatDate(client.lastVisitAt)}</td>
                      <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums">
                        {formatCurrency(client.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border-luxury">
              {clients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-charcoal/50 transition-colors">
                  <Avatar name={`${client.firstName} ${client.lastName}`} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">{client.phone ?? client.email ?? '—'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-tertiary">{client.totalVisits} визитов</span>
                      <span className="text-xs font-medium text-champagne ml-auto">
                        {formatCurrency(client.totalSpent)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-luxury">
                <span className="text-xs text-text-tertiary">
                  Страница {page} из {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Далее
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
