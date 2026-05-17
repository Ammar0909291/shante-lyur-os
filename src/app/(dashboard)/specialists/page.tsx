import * as React from 'react';
import { Plus, Star, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';

interface Specialist {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  specializations: string[];
  rating: number;
  totalBookings: number;
  revenueMtd: number;
  active: boolean;
  yearsExperience: number;
}

const mockSpecialists: Specialist[] = [
  {
    id: 's1',
    name: 'Мария Петрова',
    title: 'Врач-косметолог',
    email: 'm.petrova@shantelyur.ru',
    phone: '+7 (916) 111-22-33',
    specializations: ['Гиалуроновый лифтинг', 'Биоревитализация', 'Пилинг'],
    rating: 4.9,
    totalBookings: 68,
    revenueMtd: 98_00000,
    active: true,
    yearsExperience: 8,
  },
  {
    id: 's2',
    name: 'Ольга Климова',
    title: 'Специалист по лазерной косметологии',
    email: 'o.klimova@shantelyur.ru',
    phone: '+7 (926) 222-33-44',
    specializations: ['Лазерная эпиляция', 'Фотоомоложение', 'Карбоновый пилинг'],
    rating: 4.8,
    totalBookings: 54,
    revenueMtd: 82_00000,
    active: true,
    yearsExperience: 6,
  },
  {
    id: 's3',
    name: 'Дарья Светлова',
    title: 'Дерматолог-косметолог',
    email: 'd.svetlova@shantelyur.ru',
    phone: '+7 (985) 333-44-55',
    specializations: ['Контурная пластика', 'Ботулинотерапия', 'Нити'],
    rating: 5.0,
    totalBookings: 41,
    revenueMtd: 74_00000,
    active: true,
    yearsExperience: 12,
  },
  {
    id: 's4',
    name: 'Наталья Волкова',
    title: 'Массажист-остеопат',
    email: 'n.volkova@shantelyur.ru',
    phone: '+7 (967) 444-55-66',
    specializations: ['Ароматерапия', 'Лимфодренаж', 'Стоун-терапия'],
    rating: 4.7,
    totalBookings: 38,
    revenueMtd: 52_00000,
    active: true,
    yearsExperience: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 text-champagne fill-champagne" aria-hidden="true" />
      <span className="text-sm font-semibold text-text-primary">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function SpecialistsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
            Специалисты
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {mockSpecialists.length} специалиста в студии
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить специалиста
        </Button>
      </div>

      {/* Specialist cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        {mockSpecialists.map((spec) => (
          <div
            key={spec.id}
            className="bg-onyx border border-border-luxury rounded-2xl p-6 hover:border-border-light transition-all duration-200 hover:shadow-luxury"
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <Avatar name={spec.name} size="xl" />
                <div>
                  <h3 className="font-serif text-lg font-medium text-text-primary leading-tight">
                    {spec.name}
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">{spec.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <StarRating rating={spec.rating} />
                    <Badge variant={spec.active ? 'confirmed' : 'cancelled'} dot>
                      {spec.active ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-charcoal rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-champagne" aria-hidden="true" />
                </div>
                <p className="font-serif text-xl font-medium text-text-primary">{spec.totalBookings}</p>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-0.5">Записей</p>
              </div>
              <div className="bg-charcoal rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-sage" aria-hidden="true" />
                </div>
                <p className="font-serif text-base font-medium text-text-primary leading-tight">
                  {formatCurrency(spec.revenueMtd)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-0.5">Выручка/мес</p>
              </div>
              <div className="bg-charcoal rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-3.5 h-3.5 text-lavender" aria-hidden="true" />
                </div>
                <p className="font-serif text-xl font-medium text-text-primary">{spec.yearsExperience}</p>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-0.5">Лет опыта</p>
              </div>
            </div>

            {/* Specializations */}
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">
                Специализации
              </p>
              <div className="flex flex-wrap gap-1.5">
                {spec.specializations.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg text-xs bg-charcoal text-text-secondary border border-border-luxury"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Contacts */}
            <div className="pt-4 border-t border-border-luxury flex items-center justify-between">
              <div>
                <p className="text-xs text-text-tertiary">{spec.email}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{spec.phone}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Расписание</Button>
                <Button variant="secondary" size="sm">Изменить</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
