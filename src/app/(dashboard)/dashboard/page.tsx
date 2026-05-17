import * as React from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  Star,
  Plus,
  UserPlus,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTime, formatCurrency, getGreeting } from '@/lib/utils';

// Mock data — will be replaced by API calls
const mockStats = {
  todayBookings: { value: 12, subtitle: '3 ожидают подтверждения', trend: { value: 8, positive: true, label: 'vs вчера' } },
  revenueMtd: { value: formatCurrency(248_00000), subtitle: 'за текущий месяц', trend: { value: 14, positive: true, label: 'vs пред. месяц' } },
  activeClients: { value: 847, subtitle: '+23 за этот месяц', trend: { value: 5, positive: true, label: 'vs пред. месяц' } },
  avgRating: { value: '4.9', subtitle: 'из 5.0 (312 отзывов)', trend: { value: 2, positive: true, label: 'vs пред. месяц' } },
};

const mockAppointments = [
  { id: '1', client: 'Анна Соколова', service: 'Гиалуроновый лифтинг', specialist: 'Мария П.', time: new Date('2025-05-17T09:00:00'), status: 'CONFIRMED', amount: 12_00000 },
  { id: '2', client: 'Елена Морозова', service: 'Антивозрастной массаж лица', specialist: 'Ольга К.', time: new Date('2025-05-17T10:30:00'), status: 'CONFIRMED', amount: 8_00000 },
  { id: '3', client: 'Светлана Ким', service: 'Пилинг & Детокс', specialist: 'Мария П.', time: new Date('2025-05-17T11:00:00'), status: 'PENDING', amount: 6_50000 },
  { id: '4', client: 'Ирина Волкова', service: 'Ароматерапевтический массаж', specialist: 'Наталья В.', time: new Date('2025-05-17T12:00:00'), status: 'COMPLETED', amount: 7_00000 },
  { id: '5', client: 'Татьяна Лебедева', service: 'Лазерная эпиляция', specialist: 'Ольга К.', time: new Date('2025-05-17T13:30:00'), status: 'CONFIRMED', amount: 15_00000 },
  { id: '6', client: 'Наталья Попова', service: 'Биоревитализация', specialist: 'Дарья С.', time: new Date('2025-05-17T14:00:00'), status: 'PENDING', amount: 18_00000 },
  { id: '7', client: 'Ольга Новикова', service: 'Нейромышечный массаж', specialist: 'Наталья В.', time: new Date('2025-05-17T15:00:00'), status: 'CANCELLED', amount: 9_00000 },
  { id: '8', client: 'Марина Зайцева', service: 'Глубокое увлажнение', specialist: 'Мария П.', time: new Date('2025-05-17T16:00:00'), status: 'CONFIRMED', amount: 5_50000 },
];

export default function DashboardPage() {
  const greeting = getGreeting();

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {greeting}, Администратор
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Вот что происходит в вашей студии сегодня
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Clock className="w-4 h-4" />}>
            Заблокировать время
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
            Клиент
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Запись
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Записи сегодня"
          value={mockStats.todayBookings.value}
          subtitle={mockStats.todayBookings.subtitle}
          trend={mockStats.todayBookings.trend}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="Выручка за месяц"
          value={mockStats.revenueMtd.value}
          subtitle={mockStats.revenueMtd.subtitle}
          trend={mockStats.revenueMtd.trend}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Активные клиенты"
          value={mockStats.activeClients.value}
          subtitle={mockStats.activeClients.subtitle}
          trend={mockStats.activeClients.trend}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Средний рейтинг"
          value={mockStats.avgRating.value}
          subtitle={mockStats.avgRating.subtitle}
          trend={mockStats.avgRating.trend}
          icon={<Star className="w-5 h-5" />}
        />
      </div>

      {/* Recent appointments */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            Записи на сегодня
          </h3>
          <Button variant="ghost" size="sm">
            Все записи →
          </Button>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Услуга
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Специалист
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Время
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Статус
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {mockAppointments.map((apt) => (
                <tr
                  key={apt.id}
                  className="hover:bg-charcoal/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={apt.client} size="sm" />
                      <span className="font-medium text-text-primary whitespace-nowrap">
                        {apt.client}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">
                    {apt.service}
                  </td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                    {apt.specialist}
                  </td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">
                    {formatTime(apt.time)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                      {getAppointmentStatusLabel(apt.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                    {formatCurrency(apt.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="sm:hidden divide-y divide-border-luxury">
          {mockAppointments.map((apt) => (
            <div key={apt.id} className="px-4 py-4 flex items-start gap-3">
              <Avatar name={apt.client} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary text-sm truncate">
                    {apt.client}
                  </span>
                  <Badge variant={getAppointmentStatusBadgeVariant(apt.status)}>
                    {getAppointmentStatusLabel(apt.status)}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{apt.service}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-tertiary">{formatTime(apt.time)}</span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">{apt.specialist}</span>
                  <span className="text-xs font-medium text-champagne ml-auto">
                    {formatCurrency(apt.amount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
