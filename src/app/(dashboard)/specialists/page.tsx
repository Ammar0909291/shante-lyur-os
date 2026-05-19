'use client';

import * as React from 'react';
import { Search, UserCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Specialist {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  status?: string;
  commissionRate?: number;
  rating?: number;
}

interface ApiResponse {
  success: boolean;
  data: { items: Specialist[]; total: number };
}

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const fetchSpecialists = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/specialists?${params}`, { credentials: 'include' });
      const json: ApiResponse = await res.json();
      if (!json.success) throw new Error('Не удалось загрузить специалистов');
      setSpecialists(json.data.items);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    fetchSpecialists();
  }, [fetchSpecialists]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return specialists;
    const q = search.toLowerCase();
    return specialists.filter(
      (s) =>
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.specialization?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q),
    );
  }, [specialists, search]);

  const totalPages = Math.ceil(total / limit);

  const getDisplayName = (s: Specialist) =>
    [s.firstName, s.lastName].filter(Boolean).join(' ') || s.id.slice(0, 8);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Специалисты</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {total > 0 ? `Всего: ${total}` : 'Список специалистов'}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<UserCheck className="w-4 h-4" />}>
          Добавить специалиста
        </Button>
      </div>

      <Input
        placeholder="Поиск по имени или специализации..."
        leftAddon={<Search className="w-4 h-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-tertiary">
            <span className="animate-pulse">Загрузка...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchSpecialists}>
              Повторить
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <UserCheck className="w-10 h-10 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">
              {search ? 'Специалисты не найдены' : 'Специалистов пока нет'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Специалист
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Специализация
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Контакт
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Рейтинг
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Комиссия
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={getDisplayName(s)} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">
                            {getDisplayName(s)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {s.specialization ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        <div>{s.email ?? '—'}</div>
                        {s.phone && <div className="text-xs text-text-tertiary">{s.phone}</div>}
                      </td>
                      <td className="px-4 py-4 text-text-secondary tabular-nums">
                        {s.rating != null ? s.rating.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-4 text-text-secondary tabular-nums">
                        {s.commissionRate != null ? `${(s.commissionRate * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={s.status === 'ACTIVE' ? 'success' : 'default'}>
                          {s.status === 'ACTIVE' ? 'Активен' : (s.status ?? '—')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-border-luxury">
              {filtered.map((s) => (
                <div key={s.id} className="px-4 py-4 flex items-start gap-3">
                  <Avatar name={getDisplayName(s)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">
                        {getDisplayName(s)}
                      </span>
                      <Badge variant={s.status === 'ACTIVE' ? 'success' : 'default'}>
                        {s.status === 'ACTIVE' ? 'Активен' : (s.status ?? '—')}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{s.specialization ?? '—'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {s.rating != null && (
                        <span className="text-xs text-text-tertiary">★ {s.rating.toFixed(1)}</span>
                      )}
                      {s.commissionRate != null && (
                        <span className="text-xs text-text-tertiary">
                          Комиссия: {(s.commissionRate * 100).toFixed(0)}%
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
