'use client';

import * as React from 'react';
import {
  Search,
  Star,
  Calendar,
  TrendingUp,
  Users,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { StatCard } from '@/components/ui/stat-card';
import { useLocale } from '@/components/providers/locale-provider';

interface Specialist {
  id: string;
  rating?: number;
  totalBookings?: number;
  user: {
    name: string;
    email?: string;
    phone?: string;
  };
  specializations?: string[];
  revenue?: number;
  isActive?: boolean;
}

const MOCK_SPECIALISTS: Specialist[] = [
  {
    id: 's1',
    rating: 4.9,
    totalBookings: 312,
    revenue: 154000000,
    isActive: true,
    specializations: ['Окрашивание', 'Стрижки', 'Укладки'],
    user: { name: 'Елена Смирнова', email: 'e.smirnova@shantelyur.ru', phone: '+7 916 111-22-33' },
  },
  {
    id: 's2',
    rating: 4.8,
    totalBookings: 278,
    revenue: 126000000,
    isActive: true,
    specializations: ['Маникюр', 'Педикюр', 'Дизайн'],
    user: { name: 'Мария Попова', email: 'm.popova@shantelyur.ru', phone: '+7 903 222-33-44' },
  },
  {
    id: 's3',
    rating: 4.7,
    totalBookings: 241,
    revenue: 118500000,
    isActive: true,
    specializations: ['Уход за лицом', 'Пилинг', 'Массаж'],
    user: { name: 'Ирина Соколова', email: 'i.sokolova@shantelyur.ru', phone: '+7 925 333-44-55' },
  },
  {
    id: 's4',
    rating: 4.6,
    totalBookings: 189,
    revenue: 95000000,
    isActive: true,
    specializations: ['Визаж', 'Брови', 'Ресницы'],
    user: { name: 'Алина Петрова', email: 'a.petrova@shantelyur.ru', phone: '+7 916 444-55-66' },
  },
  {
    id: 's5',
    rating: 4.5,
    totalBookings: 156,
    revenue: 72000000,
    isActive: false,
    specializations: ['Массаж', 'СПА'],
    user: { name: 'Юлия Новикова', email: 'yu.novikova@shantelyur.ru', phone: '+7 903 555-66-77' },
  },
  {
    id: 's6',
    rating: 4.8,
    totalBookings: 203,
    revenue: 108000000,
    isActive: true,
    specializations: ['Эпиляция', 'Уход за телом'],
    user: { name: 'Ольга Лебедева', email: 'o.lebedeva@shantelyur.ru', phone: '+7 925 666-77-88' },
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 text-champagne fill-champagne" />
      <span className="text-sm font-medium text-champagne">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function SpecialistsPage() {
  const { t } = useLocale();
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'active' | 'inactive'>('all');

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/specialists');
        if (res.ok) {
          const data = await res.json();
          const items: Specialist[] = Array.isArray(data) ? data : data.specialists ?? [];
          setSpecialists(items.length > 0 ? items : MOCK_SPECIALISTS);
        } else {
          setSpecialists(MOCK_SPECIALISTS);
        }
      } catch {
        setSpecialists(MOCK_SPECIALISTS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = React.useMemo(() => {
    return specialists.filter((s) => {
      if (filter === 'active' && !s.isActive) return false;
      if (filter === 'inactive' && s.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = s.user.name.toLowerCase();
        const specs = s.specializations?.join(' ').toLowerCase() ?? '';
        if (!name.includes(q) && !specs.includes(q)) return false;
      }
      return true;
    });
  }, [specialists, filter, search]);

  const stats = React.useMemo(() => {
    const active = specialists.filter(s => s.isActive).length;
    const totalBookings = specialists.reduce((acc, s) => acc + (s.totalBookings ?? 0), 0);
    const avgRating = specialists.length > 0
      ? specialists.reduce((acc, s) => acc + (s.rating ?? 0), 0) / specialists.length
      : 0;
    const totalRevenue = specialists.reduce((acc, s) => acc + (s.revenue ?? 0), 0);
    return { active, totalBookings, avgRating, totalRevenue };
  }, [specialists]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-medium text-text-primary">
          {t('nav.specialists')}
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Команда мастеров и управление расписанием
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Активных мастеров"
          value={loading ? '—' : stats.active}
          icon={<Sparkles className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Всего записей"
          value={loading ? '—' : stats.totalBookings}
          icon={<Calendar className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Средний рейтинг"
          value={loading ? '—' : stats.avgRating.toFixed(1)}
          icon={<Star className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Общая выручка"
          value={loading ? '—' : formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по имени, специализации..."
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
        <div className="flex items-center gap-1.5">
          {([['all', 'Все'], ['active', 'Активные'], ['inactive', 'Неактивные']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-sm font-medium transition-all',
                filter === key
                  ? 'bg-champagne/10 text-champagne border border-champagne/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialist Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-onyx border border-border-luxury rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-charcoal animate-shimmer" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-charcoal rounded animate-shimmer" />
                  <div className="h-3 w-24 bg-charcoal rounded animate-shimmer" />
                </div>
              </div>
              <div className="h-8 bg-charcoal rounded animate-shimmer" />
              <div className="h-4 bg-charcoal rounded animate-shimmer" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-16 text-center">
          <Users className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">Мастера не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((spec) => (
            <div
              key={spec.id}
              className={cn(
                'bg-onyx border rounded-2xl p-5 transition-all duration-200',
                'hover:border-border-light hover:shadow-luxury',
                spec.isActive ? 'border-border-luxury' : 'border-border-luxury opacity-60',
              )}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={spec.user.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{spec.user.name}</p>
                    {spec.rating !== undefined && <StarRating rating={spec.rating} />}
                  </div>
                </div>
                <Badge variant={spec.isActive ? 'success' : 'default'} dot>
                  {spec.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>

              {/* Specializations */}
              {spec.specializations && spec.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {spec.specializations.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg text-xs bg-charcoal text-text-secondary border border-border-luxury"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-charcoal rounded-xl p-3">
                  <p className="text-xs text-text-tertiary mb-1">Записей</p>
                  <p className="text-lg font-semibold text-text-primary">{spec.totalBookings ?? 0}</p>
                </div>
                <div className="bg-charcoal rounded-xl p-3">
                  <p className="text-xs text-text-tertiary mb-1">Выручка</p>
                  <p className="text-sm font-semibold text-champagne truncate">
                    {spec.revenue ? formatCurrency(spec.revenue) : '—'}
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5 border-t border-border-luxury pt-3">
                {spec.user.phone && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{spec.user.phone}</span>
                  </div>
                )}
                {spec.user.email && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{spec.user.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-text-tertiary text-center">
          Показано {filtered.length} из {specialists.length} мастеров
        </p>
      )}
    </div>
  );
}
