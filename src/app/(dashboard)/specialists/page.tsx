import * as React from 'react';
import { Star, Calendar, TrendingUp, Users, Sparkles, Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency, cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE: 'Массаж',
  INJECTION: 'Инъекции',
  LASER: 'Лазер',
  FACIAL: 'Уход за лицом',
  BODY_CONTOURING: 'Коррекция тела',
  HAIR_REMOVAL: 'Эпиляция',
};

const CATEGORY_COLORS: Record<string, string> = {
  COSMETOLOGY: 'bg-blush/10 text-blush border-blush/20',
  MASSAGE: 'bg-lavender/10 text-lavender border-lavender/20',
  INJECTION: 'bg-red-500/10 text-red-300 border-red-500/20',
  LASER: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  FACIAL: 'bg-blush/10 text-blush border-blush/20',
  BODY_CONTOURING: 'bg-sage/10 text-sage border-sage/20',
  HAIR_REMOVAL: 'bg-champagne/10 text-champagne border-champagne/20',
};

interface SpecialistCard {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  status: 'ACTIVE' | 'ON_VACATION' | 'INACTIVE';
  categories: string[];
  todayAppointments: number;
  monthRevenue: number;
  completedThisMonth: number;
}

const MOCK_SPECIALISTS: SpecialistCard[] = [
  {
    id: '1',
    firstName: 'Мария', lastName: 'Петрова',
    title: 'Косметолог-эстетист',
    bio: 'Специалист по инъекционным методикам омоложения и коррекции кожи лица. Сертифицирован по Juvederm, Botox, RF-лифтингу.',
    experienceYears: 7,
    rating: 4.9, reviewCount: 184,
    status: 'ACTIVE',
    categories: ['COSMETOLOGY', 'INJECTION', 'FACIAL'],
    todayAppointments: 4,
    monthRevenue: 31200000,
    completedThisMonth: 42,
  },
  {
    id: '2',
    firstName: 'Ольга', lastName: 'Краснова',
    title: 'Лазерный специалист',
    bio: 'Специализация: лазерные технологии, аппаратная косметология, RF-лифтинг, лазерная эпиляция.',
    experienceYears: 5,
    rating: 4.8, reviewCount: 97,
    status: 'ACTIVE',
    categories: ['LASER', 'HAIR_REMOVAL', 'COSMETOLOGY'],
    todayAppointments: 3,
    monthRevenue: 22800000,
    completedThisMonth: 31,
  },
  {
    id: '3',
    firstName: 'Наталья', lastName: 'Волчкова',
    title: 'Массажист-остеопат',
    bio: 'Эксперт в области нейромышечного и ароматерапевтического массажа, работа с постуральными нарушениями.',
    experienceYears: 9,
    rating: 5.0, reviewCount: 231,
    status: 'ACTIVE',
    categories: ['MASSAGE', 'BODY_CONTOURING'],
    todayAppointments: 3,
    monthRevenue: 18600000,
    completedThisMonth: 38,
  },
  {
    id: '4',
    firstName: 'Дарья', lastName: 'Смирнова',
    title: 'Косметолог-инъекционист',
    bio: 'Специализация: контурная пластика, биоревитализация, ботулинотерапия. Мастер естественного результата.',
    experienceYears: 6,
    rating: 4.9, reviewCount: 142,
    status: 'ACTIVE',
    categories: ['INJECTION', 'COSMETOLOGY', 'FACIAL'],
    todayAppointments: 2,
    monthRevenue: 26400000,
    completedThisMonth: 35,
  },
];

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              'w-3.5 h-3.5',
              s <= full ? 'text-champagne fill-champagne' : 'text-border-luxury',
            )}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-champagne tabular-nums">{rating.toFixed(1)}</span>
      <span className="text-xs text-text-tertiary">({reviewCount})</span>
    </div>
  );
}

const STATUS_CONFIG: Record<SpecialistCard['status'], { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ACTIVE: { label: 'Работает', variant: 'success' },
  ON_VACATION: { label: 'В отпуске', variant: 'warning' },
  INACTIVE: { label: 'Неактивен', variant: 'default' },
};

export default function SpecialistsPage() {
  const activeCount = MOCK_SPECIALISTS.filter((s) => s.status === 'ACTIVE').length;
  const totalToday = MOCK_SPECIALISTS.reduce((sum, s) => sum + s.todayAppointments, 0);
  const avgRating = (
    MOCK_SPECIALISTS.reduce((sum, s) => sum + s.rating, 0) / MOCK_SPECIALISTS.length
  ).toFixed(1);

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Специалисты
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Команда Shante Lyur Wellness Studio
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить специалиста
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Специалистов"
          value={MOCK_SPECIALISTS.length}
          subtitle={`${activeCount} активных`}
          icon={<Sparkles className="w-5 h-5" />}
        />
        <StatCard
          title="Записей сегодня"
          value={totalToday}
          subtitle="по всем специалистам"
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="Средний рейтинг"
          value={avgRating}
          subtitle="из 5.0"
          icon={<Star className="w-5 h-5" />}
        />
        <StatCard
          title="Выручка (месяц)"
          value={formatCurrency(MOCK_SPECIALISTS.reduce((s, sp) => s + sp.monthRevenue, 0))}
          subtitle="все специалисты"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Specialist cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {MOCK_SPECIALISTS.map((specialist) => {
          const { label: statusLabel, variant: statusVariant } = STATUS_CONFIG[specialist.status];
          return (
            <div
              key={specialist.id}
              className="bg-onyx border border-border-luxury rounded-2xl p-6 hover:border-border-light transition-all duration-200"
            >
              {/* Header row */}
              <div className="flex items-start gap-4 mb-4">
                <Avatar
                  name={`${specialist.firstName} ${specialist.lastName}`}
                  size="lg"
                  statusDot={specialist.status === 'ACTIVE' ? 'online' : specialist.status === 'ON_VACATION' ? 'away' : 'offline'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-text-primary">
                        {specialist.firstName} {specialist.lastName}
                      </h3>
                      <p className="text-sm text-text-secondary mt-0.5">{specialist.title}</p>
                    </div>
                    <Badge variant={statusVariant} dot>
                      {statusLabel}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={specialist.rating} reviewCount={specialist.reviewCount} />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{specialist.bio}</p>

              {/* Service categories */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {specialist.categories.map((cat) => (
                  <span
                    key={cat}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-lg border uppercase tracking-wide font-semibold',
                      CATEGORY_COLORS[cat] ?? 'bg-charcoal text-text-tertiary border-border-luxury',
                    )}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                ))}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border-luxury">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-0.5">
                    Стаж
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    {specialist.experienceYears} лет
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-0.5">
                    Сегодня
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    {specialist.todayAppointments} записей
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-0.5">
                    За месяц
                  </p>
                  <p className="text-sm font-semibold text-champagne tabular-nums">
                    {formatCurrency(specialist.monthRevenue)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1">
                  Расписание
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  Профиль
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
