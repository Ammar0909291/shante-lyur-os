'use client';

import * as React from 'react';
import { Search, Scissors, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  category?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
  description?: string;
}

interface ApiResponse {
  success: boolean;
  data: { items: Service[]; total: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE: 'Массаж',
  INJECTION: 'Инъекции',
  LASER: 'Лазер',
  BODY_CONTOURING: 'Коррекция тела',
  HAIR_REMOVAL: 'Эпиляция',
  FACIAL: 'Уход за лицом',
  OTHER: 'Другое',
};

export default function ServicesPage() {
  const [services, setServices] = React.useState<Service[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const fetchServices = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/services?${params}`, { credentials: 'include' });
      const json: ApiResponse = await res.json();
      if (!json.success) throw new Error('Не удалось загрузить услуги');
      setServices(json.data.items);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    const id = setTimeout(() => fetchServices(), search ? 400 : 0);
    return () => clearTimeout(id);
  }, [fetchServices, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Услуги</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {total > 0 ? `Всего: ${total}` : 'Каталог услуг'}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить услугу
        </Button>
      </div>

      <Input
        placeholder="Поиск по названию или категории..."
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
            <Button variant="secondary" size="sm" onClick={fetchServices}>
              Повторить
            </Button>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Scissors className="w-10 h-10 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">
              {search ? 'Услуги не найдены' : 'Услуг пока нет'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Название
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Категория
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Длительность
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Цена
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium text-text-primary">{s.name}</span>
                          {s.description && (
                            <p className="text-xs text-text-tertiary mt-0.5 max-w-[240px] truncate">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {s.category ? (CATEGORY_LABELS[s.category] ?? s.category) : '—'}
                      </td>
                      <td className="px-4 py-4 text-text-secondary tabular-nums">
                        {s.duration != null ? `${s.duration} мин` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                        {s.price != null ? formatCurrency(s.price) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={s.isActive !== false ? 'success' : 'default'}>
                          {s.isActive !== false ? 'Активна' : 'Неактивна'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-border-luxury">
              {services.map((s) => (
                <div key={s.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-text-primary text-sm">{s.name}</span>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {s.category ? (CATEGORY_LABELS[s.category] ?? s.category) : '—'}
                      </p>
                    </div>
                    <Badge variant={s.isActive !== false ? 'success' : 'default'}>
                      {s.isActive !== false ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {s.duration != null && (
                      <span className="text-xs text-text-tertiary">{s.duration} мин</span>
                    )}
                    {s.price != null && (
                      <span className="text-xs font-medium text-champagne ml-auto">
                        {formatCurrency(s.price)}
                      </span>
                    )}
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
