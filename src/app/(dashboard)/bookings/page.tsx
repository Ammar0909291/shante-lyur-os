import * as React from 'react';
import { Calendar, Plus, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatTime, formatDate, formatCurrency } from '@/lib/utils';

const mockBookings = [
  { id: '1', client: 'Анна Соколова', service: 'Гиалуроновый лифтинг', specialist: 'Мария Петрова', time: new Date('2025-05-19T09:00:00'), status: 'CONFIRMED', amount: 1200000 },
  { id: '2', client: 'Елена Морозова', service: 'Антивозрастной массаж лица', specialist: 'Ольга Козлова', time: new Date('2025-05-19T10:30:00'), status: 'CONFIRMED', amount: 800000 },
  { id: '3', client: 'Светлана Ким', service: 'Пилинг & Детокс', specialist: 'Мария Петрова', time: new Date('2025-05-19T11:00:00'), status: 'PENDING', amount: 650000 },
  { id: '4', client: 'Ирина Волкова', service: 'Ароматерапевтический массаж', specialist: 'Наталья Васильева', time: new Date('2025-05-19T12:00:00'), status: 'COMPLETED', amount: 700000 },
  { id: '5', client: 'Татьяна Лебедева', service: 'Лазерная эпиляция', specialist: 'Ольга Козлова', time: new Date('2025-05-19T13:30:00'), status: 'CONFIRMED', amount: 1500000 },
  { id: '6', client: 'Наталья Попова', service: 'Биоревитализация', specialist: 'Дарья Смирнова', time: new Date('2025-05-20T10:00:00'), status: 'PENDING', amount: 1800000 },
  { id: '7', client: 'Ольга Новикова', service: 'Нейромышечный массаж', specialist: 'Наталья Васильева', time: new Date('2025-05-20T14:00:00'), status: 'CANCELLED', amount: 900000 },
  { id: '8', client: 'Марина Зайцева', service: 'Глубокое увлажнение', specialist: 'Мария Петрова', time: new Date('2025-05-21T09:00:00'), status: 'CONFIRMED', amount: 550000 },
  { id: '9', client: 'Валерия Орлова', service: 'Контурная пластика', specialist: 'Дарья Смирнова', time: new Date('2025-05-21T11:30:00'), status: 'PENDING', amount: 2200000 },
  { id: '10', client: 'Юлия Миронова', service: 'RF-лифтинг', specialist: 'Ольга Козлова', time: new Date('2025-05-22T10:00:00'), status: 'CONFIRMED', amount: 1400000 },
];

export default function BookingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Записи
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Управление записями клиентов
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
            Фильтры
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Новая запись
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего записей', value: mockBookings.length },
          { label: 'Подтверждено', value: mockBookings.filter((b) => b.status === 'CONFIRMED').length },
          { label: 'Ожидают', value: mockBookings.filter((b) => b.status === 'PENDING').length },
          { label: 'Завершено', value: mockBookings.filter((b) => b.status === 'COMPLETED').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-xs text-text-tertiary">{label}</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-champagne" />
            <h3 className="font-serif text-base font-medium text-text-primary">
              Все записи
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="search"
                placeholder="Поиск..."
                className="bg-charcoal border border-border-luxury rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 w-40"
              />
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Специалист</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Дата/Время</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {mockBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-charcoal/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={booking.client} size="sm" />
                      <span className="font-medium text-text-primary whitespace-nowrap">{booking.client}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">{booking.service}</td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap">{booking.specialist}</td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">
                    <div>{formatDate(booking.time)}</div>
                    <div className="text-xs text-text-tertiary">{formatTime(booking.time)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={getAppointmentStatusBadgeVariant(booking.status)} dot>
                      {getAppointmentStatusLabel(booking.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                    {formatCurrency(booking.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="sm:hidden divide-y divide-border-luxury">
          {mockBookings.map((booking) => (
            <div key={booking.id} className="px-4 py-4 flex items-start gap-3">
              <Avatar name={booking.client} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary text-sm truncate">{booking.client}</span>
                  <Badge variant={getAppointmentStatusBadgeVariant(booking.status)}>
                    {getAppointmentStatusLabel(booking.status)}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{booking.service}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-tertiary">{formatTime(booking.time)}</span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">{booking.specialist}</span>
                  <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(booking.amount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
