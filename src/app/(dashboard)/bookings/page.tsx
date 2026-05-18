'use client';

import * as React from 'react';
import {
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Filter,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import {
  Badge,
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTime, formatCurrency, formatDate, cn } from '@/lib/utils';

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
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

interface AppointmentRow {
  id: string;
  startAt: Date;
  endAt: Date;
  clientName: string;
  clientPhone: string;
  hasAllergies: boolean;
  hasRestrictions: boolean;
  serviceName: string;
  serviceCategory: string;
  specialistName: string;
  status: string;
  totalPrice: number;
  checkedInAt?: Date;
}

const BASE_DATE = new Date('2025-05-17');

const MOCK_APPOINTMENTS: AppointmentRow[] = [
  {
    id: '1',
    startAt: new Date('2025-05-17T09:00:00'), endAt: new Date('2025-05-17T10:00:00'),
    clientName: 'Ирина Волкова', clientPhone: '+7 (916) 234-56-78',
    hasAllergies: false, hasRestrictions: false,
    serviceName: 'Биоревитализация Juvederm', serviceCategory: 'INJECTION',
    specialistName: 'Мария П.', status: 'COMPLETED', totalPrice: 1800000,
    checkedInAt: new Date('2025-05-17T08:55:00'),
  },
  {
    id: '2',
    startAt: new Date('2025-05-17T10:30:00'), endAt: new Date('2025-05-17T11:30:00'),
    clientName: 'Анна Соколова', clientPhone: '+7 (903) 456-78-90',
    hasAllergies: true, hasRestrictions: false,
    serviceName: 'BHA-пилинг 30%', serviceCategory: 'COSMETOLOGY',
    specialistName: 'Мария П.', status: 'IN_PROGRESS', totalPrice: 800000,
  },
  {
    id: '3',
    startAt: new Date('2025-05-17T11:00:00'), endAt: new Date('2025-05-17T11:45:00'),
    clientName: 'Светлана Ким', clientPhone: '+7 (926) 789-01-23',
    hasAllergies: false, hasRestrictions: false,
    serviceName: 'Пилинг & Детокс', serviceCategory: 'FACIAL',
    specialistName: 'Дарья С.', status: 'CONFIRMED', totalPrice: 650000,
  },
  {
    id: '4',
    startAt: new Date('2025-05-17T12:00:00'), endAt: new Date('2025-05-17T13:30:00'),
    clientName: 'Наталья Волчкова', clientPhone: '+7 (921) 567-89-01',
    hasAllergies: true, hasRestrictions: true,
    serviceName: 'Нейромышечный массаж (спина + шея)', serviceCategory: 'MASSAGE',
    specialistName: 'Наталья В.', status: 'CONFIRMED', totalPrice: 1200000,
  },
  {
    id: '5',
    startAt: new Date('2025-05-17T13:30:00'), endAt: new Date('2025-05-17T15:00:00'),
    clientName: 'Татьяна Лебедева', clientPhone: '+7 (906) 890-12-34',
    hasAllergies: false, hasRestrictions: true,
    serviceName: 'Лазерная эпиляция (ноги)', serviceCategory: 'HAIR_REMOVAL',
    specialistName: 'Ольга К.', status: 'PENDING', totalPrice: 1500000,
  },
  {
    id: '6',
    startAt: new Date('2025-05-17T14:00:00'), endAt: new Date('2025-05-17T15:00:00'),
    clientName: 'Наталья Попова', clientPhone: '+7 (916) 123-45-67',
    hasAllergies: false, hasRestrictions: false,
    serviceName: 'Контурная пластика губ', serviceCategory: 'INJECTION',
    specialistName: 'Дарья С.', status: 'PENDING', totalPrice: 1800000,
  },
  {
    id: '7',
    startAt: new Date('2025-05-17T15:00:00'), endAt: new Date('2025-05-17T16:30:00'),
    clientName: 'Ольга Новикова', clientPhone: '+7 (929) 012-34-56',
    hasAllergies: true, hasRestrictions: false,
    serviceName: 'Антицеллюлитный массаж', serviceCategory: 'BODY_CONTOURING',
    specialistName: 'Наталья В.', status: 'CANCELLED', totalPrice: 900000,
  },
  {
    id: '8',
    startAt: new Date('2025-05-17T16:00:00'), endAt: new Date('2025-05-17T17:00:00'),
    clientName: 'Марина Зайцева', clientPhone: '+7 (916) 901-23-45',
    hasAllergies: false, hasRestrictions: false,
    serviceName: 'Глубокое увлажнение', serviceCategory: 'FACIAL',
    specialistName: 'Мария П.', status: 'CONFIRMED', totalPrice: 550000,
  },
  {
    id: '9',
    startAt: new Date('2025-05-17T17:00:00'), endAt: new Date('2025-05-17T18:00:00'),
    clientName: 'Елена Морозова', clientPhone: '+7 (495) 678-90-12',
    hasAllergies: true, hasRestrictions: false,
    serviceName: 'RF-лифтинг лица', serviceCategory: 'COSMETOLOGY',
    specialistName: 'Ольга К.', status: 'CONFIRMED', totalPrice: 1100000,
  },
];

const SPECIALISTS = ['Все', 'Мария П.', 'Ольга К.', 'Наталья В.', 'Дарья С.'];
const CATEGORIES = ['Все', ...Object.keys(SERVICE_CATEGORY_LABELS)];
const STATUSES = ['Все', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function BookingsPage() {
  const [currentDate, setCurrentDate] = React.useState(BASE_DATE);
  const [specialistFilter, setSpecialistFilter] = React.useState('Все');
  const [categoryFilter, setCategoryFilter] = React.useState('Все');
  const [statusFilter, setStatusFilter] = React.useState('Все');
  const [showFilters, setShowFilters] = React.useState(false);

  const filtered = MOCK_APPOINTMENTS.filter((a) => {
    const matchSpecialist = specialistFilter === 'Все' || a.specialistName === specialistFilter;
    const matchCategory = categoryFilter === 'Все' || a.serviceCategory === categoryFilter;
    const matchStatus = statusFilter === 'Все' || a.status === statusFilter;
    return matchSpecialist && matchCategory && matchStatus;
  });

  const stats = {
    total: MOCK_APPOINTMENTS.length,
    completed: MOCK_APPOINTMENTS.filter((a) => a.status === 'COMPLETED').length,
    inProgress: MOCK_APPOINTMENTS.filter((a) => a.status === 'IN_PROGRESS').length,
    pending: MOCK_APPOINTMENTS.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length,
    revenue: MOCK_APPOINTMENTS.filter((a) => a.status === 'COMPLETED' || a.status === 'IN_PROGRESS')
      .reduce((sum, a) => sum + a.totalPrice, 0),
  };

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const toToday = () => setCurrentDate(BASE_DATE);

  const isToday = currentDate.toDateString() === BASE_DATE.toDateString();

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Записи
          </h2>
          <p className="text-text-secondary mt-1 text-sm">{formatDate(currentDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon-sm" onClick={prevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" size="sm" onClick={toToday}>
              Сегодня
            </Button>
          )}
          <Button variant="secondary" size="icon-sm" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Новая запись
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего', value: stats.total, color: 'text-text-primary' },
          { label: 'Выполнено', value: stats.completed, color: 'text-sage' },
          { label: 'Ожидают', value: stats.pending, color: 'text-amber-400' },
          { label: 'Выручка', value: formatCurrency(stats.revenue), color: 'text-champagne' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1">{label}</p>
            <p className={cn('text-lg font-semibold tabular-nums', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
        </button>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-4">
            {/* Specialist filter */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">Специалист</p>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALISTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpecialistFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                      specialistFilter === s
                        ? 'bg-champagne/15 text-champagne border-champagne/30'
                        : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">Услуга</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                      categoryFilter === c
                        ? 'bg-champagne/15 text-champagne border-champagne/30'
                        : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                    )}
                  >
                    {c === 'Все' ? 'Все' : (SERVICE_CATEGORY_LABELS[c] ?? c)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">Статус</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                      statusFilter === s
                        ? 'bg-champagne/15 text-champagne border-champagne/30'
                        : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                    )}
                  >
                    {s === 'Все' ? 'Все' : getAppointmentStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Appointments table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary w-24">
                  Время
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Услуга
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Специалист
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Статус
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Сумма
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {filtered.map((apt) => {
                const durationMin = Math.round(
                  (apt.endAt.getTime() - apt.startAt.getTime()) / 60000,
                );
                return (
                  <tr
                    key={apt.id}
                    className={cn(
                      'hover:bg-charcoal/50 transition-colors',
                      apt.status === 'IN_PROGRESS' && 'bg-blue-600/5',
                      apt.status === 'CANCELLED' && 'opacity-50',
                    )}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-text-primary tabular-nums text-sm">
                        {formatTime(apt.startAt)}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{durationMin} мин</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={apt.clientName} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-primary text-sm whitespace-nowrap">
                              {apt.clientName}
                            </span>
                            {(apt.hasAllergies || apt.hasRestrictions) && (
                              <AlertTriangle
                                className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                title={apt.hasRestrictions ? 'Противопоказания!' : 'Аллергии'}
                              />
                            )}
                          </div>
                          <p className="text-[10px] text-text-tertiary">{apt.clientPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-text-primary text-sm">{apt.serviceName}</p>
                      <span
                        className={cn(
                          'inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-semibold',
                          CATEGORY_COLORS[apt.serviceCategory] ?? 'bg-charcoal text-text-tertiary border-border-luxury',
                        )}
                      >
                        {SERVICE_CATEGORY_LABELS[apt.serviceCategory] ?? apt.serviceCategory}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-text-secondary text-sm whitespace-nowrap">
                      {apt.specialistName}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                        {getAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                      {apt.status === 'CANCELLED' ? (
                        <span className="text-text-tertiary line-through">{formatCurrency(apt.totalPrice)}</span>
                      ) : (
                        formatCurrency(apt.totalPrice)
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border-luxury">
          {filtered.map((apt) => (
            <div
              key={apt.id}
              className={cn(
                'px-4 py-4',
                apt.status === 'IN_PROGRESS' && 'bg-blue-600/5',
                apt.status === 'CANCELLED' && 'opacity-50',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="text-center shrink-0 w-12">
                  <p className="font-bold text-text-primary tabular-nums text-sm">
                    {formatTime(apt.startAt)}
                  </p>
                </div>
                <Avatar name={apt.clientName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary text-sm">
                      {apt.clientName}
                      {(apt.hasAllergies || apt.hasRestrictions) && (
                        <AlertTriangle className="inline w-3 h-3 text-amber-400 ml-1.5" />
                      )}
                    </span>
                    <Badge variant={getAppointmentStatusBadgeVariant(apt.status)}>
                      {getAppointmentStatusLabel(apt.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{apt.serviceName}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-semibold',
                        CATEGORY_COLORS[apt.serviceCategory] ?? 'bg-charcoal text-text-tertiary border-border-luxury',
                      )}
                    >
                      {SERVICE_CATEGORY_LABELS[apt.serviceCategory] ?? apt.serviceCategory}
                    </span>
                    <span className="text-xs text-text-tertiary">{apt.specialistName}</span>
                    <span className="text-xs font-medium text-champagne ml-auto">
                      {formatCurrency(apt.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Calendar className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary text-sm">Записей не найдено</p>
          </div>
        )}
      </div>
    </div>
  );
}
