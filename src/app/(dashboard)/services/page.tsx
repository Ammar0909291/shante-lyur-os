import * as React from 'react';
import { Plus, Clock, Flower2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
  popular: boolean;
}

const mockServices: Service[] = [
  { id: 'sv1', name: 'Гиалуроновый лифтинг', category: 'Инъекционная косметология', description: 'Глубокое увлажнение и лифтинг кожи с использованием гиалуроновой кислоты', duration: 60, price: 12_00000, active: true, popular: true },
  { id: 'sv2', name: 'Биоревитализация', category: 'Инъекционная косметология', description: 'Восстановление упругости и эластичности кожи', duration: 75, price: 18_00000, active: true, popular: true },
  { id: 'sv3', name: 'Контурная пластика', category: 'Инъекционная косметология', description: 'Моделирование овала лица с помощью филлеров', duration: 90, price: 22_00000, active: true, popular: false },
  { id: 'sv4', name: 'Ботулинотерапия', category: 'Инъекционная косметология', description: 'Коррекция мимических морщин', duration: 45, price: 15_00000, active: true, popular: true },
  { id: 'sv5', name: 'Лазерная эпиляция', category: 'Лазерная косметология', description: 'Удаление нежелательных волос с помощью диодного лазера', duration: 120, price: 8_00000, active: true, popular: false },
  { id: 'sv6', name: 'Фотоомоложение', category: 'Лазерная косметология', description: 'Выравнивание тона кожи и борьба с пигментацией', duration: 60, price: 10_00000, active: true, popular: false },
  { id: 'sv7', name: 'Ароматерапевтический массаж', category: 'Массаж & SPA', description: 'Расслабляющий массаж с эфирными маслами', duration: 60, price: 7_00000, active: true, popular: true },
  { id: 'sv8', name: 'Лимфодренажный массаж', category: 'Массаж & SPA', description: 'Улучшение микроциркуляции и вывод токсинов', duration: 60, price: 6_00000, active: true, popular: false },
  { id: 'sv9', name: 'Пилинг & Детокс', category: 'Уход за кожей', description: 'Глубокое очищение и детоксикация кожи', duration: 90, price: 6_50000, active: true, popular: false },
  { id: 'sv10', name: 'Антивозрастной уход', category: 'Уход за кожей', description: 'Комплексный уход для зрелой кожи', duration: 75, price: 8_00000, active: false, popular: false },
];

// Group services by category
function groupByCategory(services: Service[]): Record<string, Service[]> {
  return services.reduce<Record<string, Service[]>>((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = [];
    acc[svc.category]!.push(svc);
    return acc;
  }, {});
}

export default function ServicesPage() {
  const grouped = groupByCategory(mockServices);
  const categories = Object.keys(grouped);
  const totalActive = mockServices.filter((s) => s.active).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
            Услуги
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {totalActive} активных услуг в {categories.length} категориях
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить услугу
        </Button>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const services = grouped[category] ?? [];
        return (
          <div key={category} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-champagne/10 flex items-center justify-center">
                <Flower2 className="w-4 h-4 text-champagne" aria-hidden="true" />
              </div>
              <h3 className="font-serif text-base font-medium text-text-primary">{category}</h3>
              <div className="flex-1 h-px bg-border-luxury" />
              <span className="text-xs text-text-tertiary">{services.length} услуг</span>
            </div>

            {/* Services grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-onyx border border-border-luxury rounded-xl p-5 hover:border-border-light transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-text-primary text-sm truncate">
                          {svc.name}
                        </h4>
                        {svc.popular && (
                          <Badge variant="gold" className="shrink-0">Популярное</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {svc.description}
                      </p>
                    </div>
                    <Badge variant={svc.active ? 'completed' : 'cancelled'} className="shrink-0">
                      {svc.active ? 'Активна' : 'Скрыта'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border-luxury">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="text-xs">{svc.duration} мин</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-lg font-medium text-champagne">
                        {formatCurrency(svc.price)}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Изменить">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
