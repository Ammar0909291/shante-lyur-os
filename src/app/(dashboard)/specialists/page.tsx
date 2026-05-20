'use client';

import * as React from 'react';
import { Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api-client';
import {
  CreateSpecialistDialog,
  SpecialistDetailDialog,
  type SpecialistLike,
} from '@/components/dialogs/specialist-dialogs';

const mockSpecialists: SpecialistLike[] = [
  { id: '1', name: 'Мария Петрова', specialization: 'Косметолог-эстетист', rating: 4.9, reviews: 124, appointmentsMonth: 68, status: 'ACTIVE', services: ['Гиалуроновый лифтинг', 'Пилинг', 'Биоревитализация'] },
  { id: '2', name: 'Ольга Козлова', specialization: 'Лазерный специалист', rating: 4.8, reviews: 98, appointmentsMonth: 54, status: 'ACTIVE', services: ['Лазерная эпиляция', 'RF-лифтинг', 'Фотоомоложение'] },
  { id: '3', name: 'Наталья Васильева', specialization: 'Массажист', rating: 5.0, reviews: 87, appointmentsMonth: 71, status: 'ACTIVE', services: ['Ароматерапевтический массаж', 'Нейромышечный массаж', 'Антицеллюлитный'] },
  { id: '4', name: 'Дарья Смирнова', specialization: 'Инъекционный косметолог', rating: 4.9, reviews: 76, appointmentsMonth: 42, status: 'ACTIVE', services: ['Контурная пластика', 'Биоревитализация', 'Ботокс'] },
  { id: '5', name: 'Екатерина Иванова', specialization: 'Трихолог', rating: 4.7, reviews: 45, appointmentsMonth: 29, status: 'ON_VACATION', services: ['Лечение волос', 'PRP-терапия', 'Мезотерапия волос'] },
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
  const [specialists, setSpecialists] = React.useState<SpecialistLike[]>(mockSpecialists);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SpecialistLike | null>(null);

  React.useEffect(() => {
    apiGet<{ data: SpecialistLike[] }>('/api/specialists')
      .then((res) => { if (res.data?.length) setSpecialists(res.data); })
      .catch(() => {});
  }, []);

  function reload() {
    apiGet<{ data: SpecialistLike[] }>('/api/specialists')
      .then((res) => { if (res.data?.length) setSpecialists(res.data); })
      .catch(() => {});
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Специалисты</h2>
          <p className="text-text-secondary mt-1 text-sm">Команда студии Shante Lyur</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Добавить специалиста
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Специалистов', value: specialists.length },
          { label: 'Активных', value: specialists.filter((s) => s.status === 'ACTIVE').length },
          { label: 'Средний рейтинг', value: specialists.length ? (specialists.reduce((s, sp) => s + (sp.rating ?? 0), 0) / specialists.length).toFixed(1) : '—' },
          { label: 'Записей в месяц', value: specialists.reduce((s, sp) => s + (sp.appointmentsMonth ?? 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-xs text-text-tertiary">{label}</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {specialists.map((specialist) => (
          <div
            key={specialist.id}
            className="bg-onyx border border-border-luxury rounded-2xl p-5 hover:border-champagne/30 transition-colors cursor-pointer"
            onClick={() => setSelected(specialist)}
          >
            <div className="flex items-start gap-4">
              <Avatar name={specialist.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary text-sm">{specialist.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{specialist.specialization}</p>
                  </div>
                  {specialist.status && (
                    <Badge variant={statusVariants[specialist.status] ?? 'default'}>
                      {statusLabels[specialist.status] ?? specialist.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {specialist.rating !== undefined && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-champagne fill-champagne" />
                      <span className="text-sm font-medium text-text-primary">{specialist.rating}</span>
                      {specialist.reviews !== undefined && (
                        <span className="text-xs text-text-tertiary">({specialist.reviews})</span>
                      )}
                    </div>
                  )}
                  {specialist.appointmentsMonth !== undefined && (
                    <>
                      <span className="text-xs text-text-tertiary">·</span>
                      <span className="text-xs text-text-secondary">{specialist.appointmentsMonth} записей/мес</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {specialist.services && specialist.services.length > 0 && (
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
            )}

            <div className="mt-4 pt-4 border-t border-border-luxury flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                onClick={(e) => { e.stopPropagation(); setSelected(specialist); }}
              >
                Расписание
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={(e) => { e.stopPropagation(); setSelected(specialist); }}
              >
                Профиль
              </Button>
            </div>
          </div>
        ))}
      </div>

      <CreateSpecialistDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
      <SpecialistDetailDialog
        specialist={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
      />
    </div>
  );
}
