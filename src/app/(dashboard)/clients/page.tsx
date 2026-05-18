'use client';

import * as React from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatDateShort, formatCurrency } from '@/lib/utils';

interface CustomerProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  totalVisits?: number;
  totalSpent?: number;
  loyaltyTier?: string;
  lastVisitAt?: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: { items: CustomerProfile[]; total: number };
}

type LoyaltyVariant = NonNullable<BadgeProps['variant']>;

function getLoyaltyVariant(tier?: string): LoyaltyVariant {
  const map: Record<string, LoyaltyVariant> = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
  };
  return (tier && map[tier]) ? map[tier] : 'default';
}

function getLoyaltyLabel(tier?: string) {
  const map: Record<string, string> = {
    BRONZE: 'Бронза',
    SILVER: 'Серебро',
    GOLD: 'Золото',
    PLATINUM: 'Платина',
  };
  return tier ? (map[tier] ?? tier) : '—';
}

export default function ClientsPage() {
  const [customers, setCustomers] = React.useState<CustomerProfile[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/customers?${params}`, { credentials: 'include' });
      const json: ApiResponse = await res.json();
      if (!json.success) throw new Error('Не удалось загрузить клиентов');
      setCustomers(json.data.items);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    const id = setTimeout(() => fetchCustomers(), search ? 400 : 0);
    return () => clearTimeout(id);
  }, [fetchCustomers, search]);

  const totalPages = Math.ceil(total / limit);

  const getDisplayName = (c: CustomerProfile) => {
    if (c.firstName || c.lastName) return [c.firstName, c.lastName].filter(Boolean).join(' ');
    return c.email ?? c.userId.slice(0, 8);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Клиенты</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {total > 0 ? `Всего: ${total}` : 'Список клиентов'}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Добавить клиента
        </Button>
      </div>

      <Input
        placeholder="Поиск по имени, email или телефону..."
        leftAddon={<Search className="w-4 h-4" />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-tertiary">
            <span className="animate-pulse">Загрузка...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchCustomers}>
              Повторить
            </Button>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Users className="w-10 h-10 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">
              {search ? 'Клиенты не найдены' : 'Клиентов пока нет'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Клиент
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Контакт
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Визиты
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Уровень
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Последний визит
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={getDisplayName(c)} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">
                            {getDisplayName(c)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        <div>{c.email ?? '—'}</div>
                        {c.phone && <div className="text-xs text-text-tertiary">{c.phone}</div>}
                      </td>
                      <td className="px-4 py-4 text-text-secondary tabular-nums">
                        {c.totalVisits ?? 0}
                      </td>
                      <td className="px-4 py-4">
                        {c.loyaltyTier ? (
                          <Badge variant={getLoyaltyVariant(c.loyaltyTier)}>
                            {getLoyaltyLabel(c.loyaltyTier)}
                          </Badge>
                        ) : (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">
                        {c.lastVisitAt ? formatDateShort(new Date(c.lastVisitAt)) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                        {c.totalSpent != null ? formatCurrency(c.totalSpent) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-border-luxury">
              {customers.map((c) => (
                <div key={c.id} className="px-4 py-4 flex items-start gap-3">
                  <Avatar name={getDisplayName(c)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">
                        {getDisplayName(c)}
                      </span>
                      {c.loyaltyTier && (
                        <Badge variant={getLoyaltyVariant(c.loyaltyTier)}>
                          {getLoyaltyLabel(c.loyaltyTier)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{c.email ?? '—'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-tertiary">
                        {c.totalVisits ?? 0} визитов
                      </span>
                      {c.totalSpent != null && (
                        <span className="text-xs font-medium text-champagne ml-auto">
                          {formatCurrency(c.totalSpent)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>Страница {page} из {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Назад
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
