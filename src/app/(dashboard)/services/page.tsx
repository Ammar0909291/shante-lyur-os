'use client';

import * as React from 'react';
import { Plus, Search, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-fetch';
import { cn, formatCurrency, pluralize } from '@/lib/utils';

interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  basePrice: number;
  baseDuration: number;
  isActive: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  COSMETOLOGY:      'Косметология',
  MASSAGE:          'Массаж',
  INJECTION:        'Инъекции',
  LASER:            'Лазер',
  BODY_CONTOURING:  'Коррекция фигуры',
  HAIR_REMOVAL:     'Эпиляция',
  FACIAL:           'Уход за лицом',
  OTHER:            'Другое',
};

function ServiceCard({ service }: { service: ServiceItem }) {
  const categoryLabel = CATEGORY_LABELS[service.category] ?? service.category;
  const duration = `${service.baseDuration} ${pluralize(service.baseDuration, 'минута', 'минуты', 'минут')}`;
  return (
    <div className={cn(
      'flex items-start gap-4 px-6 py-4 border-b border-border-luxury last:border-0',
      'hover:bg-charcoal/30 transition-colors',
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-text-primary text-sm truncate">{service.name}</p>
          <Badge variant={service.isActive ? 'success' : 'default'} dot>
            {service.isActive ? 'Активна' : 'Неактивна'}
          </Badge>
        </div>
        {service.description && (
          <p className="text-xs text-text-tertiary mt-1 line-clamp-1">{service.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Tag className="w-3 h-3" aria-hidden />
            {categoryLabel}
          </span>
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Clock className="w-3 h-3" aria-hidden />
            {duration}
          </span>
          <span className="text-sm font-semibold text-champagne">
            {formatCurrency(service.basePrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'Все категории' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

export default function ServicesPage() {
  const [services, setServices] = React.useState<ServiceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (category) params.set('category', category);
      const res = await apiFetch(`/api/services?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Не удалось загрузить услуги');
        return;
      }
      setServices(json.data?.items ?? json.data ?? []);
    } catch {
      setError('Не удалось загрузить услуги');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = React.useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q));
  }, [services, search]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Услуги</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Каталог услуг студии
            {!loading && filtered.length > 0 && (
              <span className="text-text-tertiary ml-2">· {filtered.length} услуг</span>
            )}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить услугу
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className={cn(
            'h-11 rounded-lg px-3 text-sm min-w-[180px]',
            'bg-charcoal border border-border-luxury text-text-primary',
            'focus:outline-none focus:border-champagne',
          )}
        >
          {CATEGORY_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">Загрузка...</div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-text-secondary text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={load}>Повторить</Button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-text-primary font-medium">Услуги не найдены</p>
            <p className="text-text-tertiary text-sm">Добавьте первую услугу в каталог</p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          filtered.map(s => <ServiceCard key={s.id} service={s} />)
        )}
      </div>
    </div>
  );
}
