'use client';

import * as React from 'react';
import { Plus, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const categories = [
  { id: 'all', label: 'Все' },
  { id: 'COSMETOLOGY', label: 'Косметология' },
  { id: 'MASSAGE', label: 'Массаж' },
  { id: 'INJECTION', label: 'Инъекции' },
  { id: 'LASER', label: 'Лазер' },
  { id: 'FACIAL', label: 'Уход за лицом' },
];

const mockServices = [
  { id: '1', name: 'Гиалуроновый лифтинг', category: 'INJECTION', price: 1200000, duration: 60, active: true, bookingsMonth: 34 },
  { id: '2', name: 'Антивозрастной массаж лица', category: 'MASSAGE', price: 800000, duration: 50, active: true, bookingsMonth: 28 },
  { id: '3', name: 'Пилинг & Детокс', category: 'COSMETOLOGY', price: 650000, duration: 45, active: true, bookingsMonth: 41 },
  { id: '4', name: 'Ароматерапевтический массаж', category: 'MASSAGE', price: 700000, duration: 60, active: true, bookingsMonth: 52 },
  { id: '5', name: 'Лазерная эпиляция', category: 'LASER', price: 1500000, duration: 90, active: true, bookingsMonth: 67 },
  { id: '6', name: 'Биоревитализация', category: 'INJECTION', price: 1800000, duration: 60, active: true, bookingsMonth: 29 },
  { id: '7', name: 'Нейромышечный массаж', category: 'MASSAGE', price: 900000, duration: 75, active: true, bookingsMonth: 38 },
  { id: '8', name: 'Глубокое увлажнение', category: 'FACIAL', price: 550000, duration: 40, active: true, bookingsMonth: 45 },
  { id: '9', name: 'Контурная пластика', category: 'INJECTION', price: 2200000, duration: 90, active: true, bookingsMonth: 18 },
  { id: '10', name: 'RF-лифтинг', category: 'LASER', price: 1400000, duration: 60, active: false, bookingsMonth: 0 },
];

const categoryLabels: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE: 'Массаж',
  INJECTION: 'Инъекции',
  LASER: 'Лазер',
  FACIAL: 'Уход за лицом',
  OTHER: 'Другое',
};

const categoryVariants: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  COSMETOLOGY: 'info',
  MASSAGE: 'success',
  INJECTION: 'warning',
  LASER: 'default',
  FACIAL: 'info',
};

export default function ServicesPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Услуги
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Каталог услуг студии
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить услугу
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего услуг', value: mockServices.length },
          { label: 'Активных', value: mockServices.filter((s) => s.active).length },
          { label: 'Записей в месяц', value: mockServices.reduce((s, sv) => s + sv.bookingsMonth, 0) },
          { label: 'Средняя стоимость', value: formatCurrency(Math.round(mockServices.reduce((s, sv) => s + sv.price, 0) / mockServices.length)) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-xs text-text-tertiary">{label}</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40 transition-colors first:bg-champagne/8 first:text-champagne first:border-champagne/30"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockServices.map((service) => (
          <div
            key={service.id}
            className="bg-onyx border border-border-luxury rounded-2xl p-5 hover:border-champagne/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text-primary text-sm leading-snug">{service.name}</h4>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={categoryVariants[service.category]}>
                    {categoryLabels[service.category]}
                  </Badge>
                  {!service.active && (
                    <Badge variant="default">Неактивна</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <span className="text-sm font-semibold text-champagne">{formatCurrency(service.price)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <span className="text-xs text-text-secondary">{service.duration} мин</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-text-tertiary">{service.bookingsMonth} записей/мес</span>
              <Button variant="ghost" size="sm" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Редактировать
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
