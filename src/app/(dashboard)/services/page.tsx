'use client';

import * as React from 'react';
import {
  Search,
  Clock,
  Flower2,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { useLocale } from '@/components/providers/locale-provider';

interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  category?: { id: string; name: string };
}

interface ServiceCategory {
  id: string;
  name: string;
  services: Service[];
}

const MOCK_SERVICES: ServiceCategory[] = [
  {
    id: 'cat1',
    name: 'Волосы',
    services: [
      { id: 'sv1', name: 'Стрижка (короткие)', description: 'Стрижка для коротких волос с укладкой', durationMinutes: 45, price: 200000, isActive: true },
      { id: 'sv2', name: 'Стрижка (длинные)', description: 'Стрижка для длинных волос с укладкой', durationMinutes: 60, price: 280000, isActive: true },
      { id: 'sv3', name: 'Окрашивание', description: 'Однотонное окрашивание', durationMinutes: 120, price: 450000, isActive: true },
      { id: 'sv4', name: 'Мелирование', description: 'Классическое мелирование', durationMinutes: 150, price: 580000, isActive: true },
      { id: 'sv5', name: 'Кератиновое выравнивание', description: 'Профессиональное выравнивание с кератином', durationMinutes: 180, price: 850000, isActive: false },
    ],
  },
  {
    id: 'cat2',
    name: 'Маникюр и педикюр',
    services: [
      { id: 'sv6', name: 'Классический маникюр', description: 'Уход за ногтями без покрытия', durationMinutes: 30, price: 120000, isActive: true },
      { id: 'sv7', name: 'Маникюр с гель-лаком', description: 'Маникюр с долговременным покрытием', durationMinutes: 60, price: 220000, isActive: true },
      { id: 'sv8', name: 'Педикюр классический', description: 'Уход за ногтями стоп', durationMinutes: 45, price: 180000, isActive: true },
      { id: 'sv9', name: 'Педикюр аппаратный', description: 'Аппаратный педикюр', durationMinutes: 60, price: 280000, isActive: true },
    ],
  },
  {
    id: 'cat3',
    name: 'Уход за лицом',
    services: [
      { id: 'sv10', name: 'Классическая чистка', description: 'Глубокое очищение кожи', durationMinutes: 90, price: 380000, isActive: true },
      { id: 'sv11', name: 'Пилинг', description: 'Химический пилинг', durationMinutes: 60, price: 320000, isActive: true },
      { id: 'sv12', name: 'Антивозрастной уход', description: 'Комплексный уход против старения', durationMinutes: 90, price: 550000, isActive: true },
    ],
  },
  {
    id: 'cat4',
    name: 'Брови и ресницы',
    services: [
      { id: 'sv13', name: 'Коррекция бровей', description: 'Моделирование формы бровей', durationMinutes: 30, price: 150000, isActive: true },
      { id: 'sv14', name: 'Окрашивание бровей', description: 'Окрашивание + коррекция', durationMinutes: 45, price: 200000, isActive: true },
      { id: 'sv15', name: 'Наращивание ресниц', description: 'Классическое наращивание', durationMinutes: 120, price: 420000, isActive: true },
    ],
  },
];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

export default function ServicesPage() {
  const { t } = useLocale();
  const [categories, setCategories] = React.useState<ServiceCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/services');
        if (res.ok) {
          const data = await res.json();
          const rawServices: Service[] = Array.isArray(data) ? data : data.services ?? [];
          if (rawServices.length > 0) {
            const catMap = new Map<string, ServiceCategory>();
            for (const svc of rawServices) {
              const catId = svc.category?.id ?? 'other';
              const catName = svc.category?.name ?? 'Прочее';
              if (!catMap.has(catId)) catMap.set(catId, { id: catId, name: catName, services: [] });
              catMap.get(catId)!.services.push(svc);
            }
            const cats = Array.from(catMap.values());
            setCategories(cats);
            setExpandedCats(new Set(cats.map(c => c.id)));
          } else {
            setCategories(MOCK_SERVICES);
            setExpandedCats(new Set(MOCK_SERVICES.map(c => c.id)));
          }
        } else {
          setCategories(MOCK_SERVICES);
          setExpandedCats(new Set(MOCK_SERVICES.map(c => c.id)));
        }
      } catch {
        setCategories(MOCK_SERVICES);
        setExpandedCats(new Set(MOCK_SERVICES.map(c => c.id)));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allServices = React.useMemo(() => categories.flatMap(c => c.services), [categories]);

  const filteredCategories = React.useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      services: cat.services.filter(svc => {
        if (!showInactive && !svc.isActive) return false;
        if (search) {
          const q = search.toLowerCase();
          return svc.name.toLowerCase().includes(q) || (svc.description?.toLowerCase().includes(q) ?? false);
        }
        return true;
      }),
    })).filter(cat => cat.services.length > 0);
  }, [categories, search, showInactive]);

  const stats = React.useMemo(() => {
    const active = allServices.filter(s => s.isActive).length;
    const avgPrice = allServices.length > 0
      ? allServices.reduce((acc, s) => acc + s.price, 0) / allServices.length
      : 0;
    const minPrice = allServices.length > 0 ? Math.min(...allServices.map(s => s.price)) : 0;
    return { total: allServices.length, active, categories: categories.length, avgPrice, minPrice };
  }, [allServices, categories.length]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-medium text-text-primary">
          {t('nav.services')}
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Каталог услуг и прейскурант
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Всего услуг"
          value={loading ? '—' : stats.total}
          icon={<Flower2 className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Активных"
          value={loading ? '—' : stats.active}
          icon={<Tag className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Категорий"
          value={loading ? '—' : stats.categories}
          icon={<Flower2 className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Средний чек"
          value={loading ? '—' : formatCurrency(stats.avgPrice)}
          icon={<Clock className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* Search + Toggle */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск услуг..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm',
              'bg-charcoal border border-border-luxury',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-champagne/50 transition-all',
            )}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer px-1">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-champagne"
          />
          <span className="text-sm text-text-secondary">Показать неактивные</span>
        </label>
      </div>

      {/* Categories */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-onyx border border-border-luxury rounded-2xl p-5 space-y-3">
              <div className="h-5 w-32 bg-charcoal rounded animate-shimmer" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-14 bg-charcoal rounded-xl animate-shimmer" />
              ))}
            </div>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-16 text-center">
          <Flower2 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">Услуги не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCats.has(cat.id);
            return (
              <div key={cat.id} className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-charcoal/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">{cat.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-charcoal text-text-tertiary border border-border-luxury">
                      {cat.services.length}
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-text-tertiary" />
                    : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border-luxury">
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-border-luxury bg-charcoal/20">
                      <span className="col-span-5 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Услуга</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Длительность</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-right">Цена</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Статус</span>
                    </div>
                    <div className="divide-y divide-border-luxury">
                      {cat.services.map((svc) => (
                        <div
                          key={svc.id}
                          className={cn(
                            'px-5 py-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2',
                            'hover:bg-charcoal/30 transition-colors',
                            !svc.isActive && 'opacity-50',
                          )}
                        >
                          <div className="col-span-5">
                            <p className="text-sm font-medium text-text-primary">{svc.name}</p>
                            {svc.description && (
                              <p className="text-xs text-text-tertiary mt-0.5">{svc.description}</p>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center gap-1 text-sm text-text-secondary">
                            <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                            {formatDuration(svc.durationMinutes)}
                          </div>
                          <div className="col-span-2 sm:text-right">
                            <span className="text-sm font-semibold text-champagne">
                              {formatCurrency(svc.price)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <Badge variant={svc.isActive ? 'success' : 'default'} dot>
                              {svc.isActive ? 'Активна' : 'Неактивна'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
