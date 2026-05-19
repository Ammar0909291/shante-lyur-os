import * as React from 'react';
import { Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const mockSpecialists = [
  {
    id: '1',
    name: 'Мария Петрова',
    specialization: 'Косметолог-эстетист',
    rating: 4.9,
    reviews: 124,
    appointmentsMonth: 68,
    status: 'ACTIVE',
    services: ['Гиалуроновый лифтинг', 'Пилинг', 'Биоревитализация'],
  },
  {
    id: '2',
    name: 'Ольга Козлова',
    specialization: 'Лазерный специалист',
    rating: 4.8,
    reviews: 98,
    appointmentsMonth: 54,
    status: 'ACTIVE',
    services: ['Лазерная эпиляция', 'RF-лифтинг', 'Фотоомоложение'],
  },
  {
    id: '3',
    name: 'Наталья Васильева',
    specialization: 'Массажист',
    rating: 5.0,
    reviews: 87,
    appointmentsMonth: 71,
    status: 'ACTIVE',
    services: ['Ароматерапевтический массаж', 'Нейромышечный массаж', 'Антицеллюлитный'],
  },
  {
    id: '4',
    name: 'Дарья Смирнова',
    specialization: 'Инъекционный косметолог',
    rating: 4.9,
    reviews: 76,
    appointmentsMonth: 42,
    status: 'ACTIVE',
    services: ['Контурная пластика', 'Биоревитализация', 'Ботокс'],
  },
  {
    id: '5',
    name: 'Екатерина Иванова',
    specialization: 'Трихолог',
    rating: 4.7,
    reviews: 45,
    appointmentsMonth: 29,
    status: 'ON_VACATION',
    services: ['Лечение волос', 'PRP-терапия', 'Мезотерапия волос'],
  },
];

const statusVariants: Record<string, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  ON_VACATION: 'warning',
  INACTIVE: 'default',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Активен',
  ON_VACATION: 'В отпуске',
  INACTIVE: 'Неактивен',
};

export default function SpecialistsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Специалисты
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Команда студии Shante Lyur
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить специалиста
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Специалистов', value: mockSpecialists.length },
          { label: 'Активных', value: mockSpecialists.filter((s) => s.status === 'ACTIVE').length },
          { label: 'Средний рейтинг', value: '4.9' },
          { label: 'Записей в месяц', value: mockSpecialists.reduce((s, sp) => s + sp.appointmentsMonth, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-xs text-text-tertiary">{label}</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Specialist cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockSpecialists.map((specialist) => (
          <div
            key={specialist.id}
            className="bg-onyx border border-border-luxury rounded-2xl p-5 hover:border-champagne/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <Avatar name={specialist.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary text-sm">{specialist.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{specialist.specialization}</p>
                  </div>
                  <Badge variant={statusVariants[specialist.status]}>
                    {statusLabels[specialist.status]}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-champagne fill-champagne" />
                    <span className="text-sm font-medium text-text-primary">{specialist.rating}</span>
                    <span className="text-xs text-text-tertiary">({specialist.reviews})</span>
                  </div>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-secondary">{specialist.appointmentsMonth} записей/мес</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {specialist.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-charcoal text-text-secondary border border-border-luxury"
                >
                  {service}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border-luxury flex items-center gap-2">
              <Button variant="secondary" size="sm" className="flex-1 text-xs">
                Расписание
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs">
                Профиль
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
