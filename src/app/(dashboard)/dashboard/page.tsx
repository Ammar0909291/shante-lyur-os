'use client';

import * as React from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  Star,
  Plus,
  UserPlus,
  Clock,
  Sparkles,
  Leaf,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTime, formatCurrency, getGreeting, cn } from '@/lib/utils';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockStats = {
  todayBookings: { value: 18, subtitle: '4 ожидают подтверждения', trend: { value: 12, positive: true, label: 'vs вчера' } },
  revenueMtd: { value: formatCurrency(324_00000), subtitle: 'за текущий месяц', trend: { value: 18, positive: true, label: 'vs пред. месяц' } },
  activeClients: { value: 847, subtitle: '+31 за этот месяц', trend: { value: 8, positive: true, label: 'vs пред. месяц' } },
  avgRating: { value: '4.8', subtitle: 'из 5.0 (1 176 отзывов)', trend: { value: 2, positive: true, label: 'vs пред. месяц' } },
};

const mockAppointments = [
  { id: '1', client: 'Анна Соколова', service: 'Гиалуроновый лифтинг', specialist: 'Мария В.', time: new Date('2026-05-23T09:00:00'), status: 'CONFIRMED', amount: 120_0000, category: 'cosmetology' },
  { id: '2', client: 'Елена Морозова', service: 'Тайский массаж', specialist: 'Наталья В.', time: new Date('2026-05-23T10:30:00'), status: 'CONFIRMED', amount: 75_0000, category: 'massage' },
  { id: '3', client: 'Светлана Ким', service: 'Химический пилинг', specialist: 'Ирина С.', time: new Date('2026-05-23T11:00:00'), status: 'PENDING', amount: 80_0000, category: 'cosmetology' },
  { id: '4', client: 'Ирина Волкова', service: 'Ароматерапевтический массаж', specialist: 'Наталья В.', time: new Date('2026-05-23T12:00:00'), status: 'COMPLETED', amount: 60_0000, category: 'massage' },
  { id: '5', client: 'Татьяна Лебедева', service: 'Лазерная эпиляция', specialist: 'Ирина С.', time: new Date('2026-05-23T13:30:00'), status: 'CONFIRMED', amount: 150_0000, category: 'cosmetology' },
  { id: '6', client: 'Наталья Попова', service: 'Биоревитализация', specialist: 'Мария В.', time: new Date('2026-05-23T14:00:00'), status: 'PENDING', amount: 180_0000, category: 'cosmetology' },
  { id: '7', client: 'Ольга Новикова', service: 'Нейромышечный массаж', specialist: 'Ольга К.', time: new Date('2026-05-23T15:00:00'), status: 'CONFIRMED', amount: 70_0000, category: 'massage' },
  { id: '8', client: 'Марина Зайцева', service: 'Антицеллюлитный массаж', specialist: 'Дарья С.', time: new Date('2026-05-23T16:00:00'), status: 'PENDING', amount: 40_0000, category: 'massage' },
];

const SPECIALIST_LOAD = [
  { name: 'Наталья В.', type: 'Массажист', bookings: 6, completed: 2, status: 'busy' as const },
  { name: 'Ольга К.', type: 'Массажист', bookings: 5, completed: 1, status: 'busy' as const },
  { name: 'Дарья С.', type: 'Массажист', bookings: 4, completed: 3, status: 'available' as const },
  { name: 'Мария В.', type: 'Косметолог', bookings: 6, completed: 2, status: 'busy' as const },
  { name: 'Ирина С.', type: 'Косметолог', bookings: 7, completed: 3, status: 'busy' as const },
];

// ─── Revenue by category ──────────────────────────────────────────────────────

const massageRevenue = mockAppointments
  .filter(a => a.category === 'massage' && a.status === 'COMPLETED')
  .reduce((s, a) => s + a.amount, 0);
const cosmoRevenue = mockAppointments
  .filter(a => a.category === 'cosmetology' && a.status === 'COMPLETED')
  .reduce((s, a) => s + a.amount, 0);
const totalCatRevenue = massageRevenue + cosmoRevenue || 1;

// ─── Occupancy data ───────────────────────────────────────────────────────────

const ROOMS = [
  { id: 1, name: 'Кабинет 1', type: 'Массаж', occupied: true, client: 'Анна С.', until: '10:30', specialist: 'Наталья В.' },
  { id: 2, name: 'Кабинет 2', type: 'Косметология', occupied: true, client: 'Светлана К.', until: '12:00', specialist: 'Ирина С.' },
  { id: 3, name: 'Кабинет 3', type: 'Массаж', occupied: false, nextAt: '12:00', specialist: 'Ольга К.' },
  { id: 4, name: 'Кабинет 4', type: 'Косметология', occupied: true, client: 'Марина З.', until: '11:30', specialist: 'Мария В.' },
  { id: 5, name: 'Кабинет 5', type: 'СПА', occupied: false, nextAt: '14:00', specialist: 'Дарья С.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [greeting] = React.useState(getGreeting);
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const occupancyPct = Math.round((ROOMS.filter(r => r.occupied).length / ROOMS.length) * 100);

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">

      {/* ── Greeting header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {greeting}, Администратор
          </h2>
          <p className="text-text-secondary mt-1 text-sm flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sage" />
            <span>
              {now.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}{ROOMS.filter(r => r.occupied).length} из {ROOMS.length} кабинетов заняты
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Clock className="w-4 h-4" />}>
            Блокировать время
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
            Клиент
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Новая запись
          </Button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
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

      {/* ── Operational row: Occupancy + Revenue split ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Room occupancy */}
        <div className="lg:col-span-2 bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-base font-medium text-text-primary">Кабинеты</h3>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-lg',
                occupancyPct >= 80 ? 'bg-sage/15 text-sage' : occupancyPct >= 50 ? 'bg-amber-400/15 text-amber-400' : 'bg-charcoal text-text-tertiary',
              )}>
                {occupancyPct}% занято
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-0 divide-x divide-y divide-border-luxury">
            {ROOMS.map(room => (
              <div
                key={room.id}
                className={cn(
                  'p-4 relative',
                  room.occupied ? 'bg-charcoal/30' : 'bg-transparent',
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-text-primary">{room.name}</p>
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0 mt-0.5',
                    room.occupied ? 'bg-amber-400' : 'bg-sage',
                  )} />
                </div>
                <p className="text-[10px] text-text-tertiary mb-2">{room.type}</p>
                {room.occupied ? (
                  <>
                    <p className="text-xs text-text-primary font-medium truncate">{room.client}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{room.specialist}</p>
                    <p className="text-[10px] text-amber-400 mt-1">до {room.until}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-sage font-medium">Свободен</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{room.specialist}</p>
                    {room.nextAt && <p className="text-[10px] text-text-tertiary mt-1">след. в {room.nextAt}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by category */}
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-base font-medium text-text-primary">Выручка сегодня</h3>
            <p className="text-xs text-text-tertiary mt-0.5">по направлениям</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="space-y-3">
              {/* Massage */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-sage" />
                    <span className="text-xs font-medium text-text-primary">Массаж</span>
                  </div>
                  <span className="text-xs font-semibold text-sage">{formatCurrency(massageRevenue)}</span>
                </div>
                <div className="h-2 bg-charcoal rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sage rounded-full transition-all"
                    style={{ width: `${Math.round((massageRevenue / totalCatRevenue) * 100)}%` }}
                  />
                </div>
              </div>
              {/* Cosmetology */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-champagne" />
                    <span className="text-xs font-medium text-text-primary">Косметология</span>
                  </div>
                  <span className="text-xs font-semibold text-champagne">{formatCurrency(cosmoRevenue)}</span>
                </div>
                <div className="h-2 bg-charcoal rounded-full overflow-hidden">
                  <div
                    className="h-full luxury-gradient rounded-full transition-all"
                    style={{ width: `${Math.round((cosmoRevenue / totalCatRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="pt-4 border-t border-border-luxury">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">Итого сегодня</span>
                <span className="text-sm font-semibold text-text-primary">{formatCurrency(massageRevenue + cosmoRevenue)}</span>
              </div>
            </div>

            {/* Specialist load */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">Загрузка мастеров</p>
              <div className="space-y-2.5">
                {SPECIALIST_LOAD.map(spec => (
                  <div key={spec.name} className="flex items-center gap-3">
                    <Avatar name={spec.name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-primary truncate">{spec.name}</span>
                        <span className="text-[10px] text-text-tertiary shrink-0">{spec.completed}/{spec.bookings}</span>
                      </div>
                      <div className="h-1 bg-charcoal rounded-full overflow-hidden mt-1">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            spec.type === 'Массажист' ? 'bg-sage/70' : 'bg-champagne/70',
                          )}
                          style={{ width: `${Math.round((spec.completed / spec.bookings) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      spec.status === 'busy' ? 'bg-amber-400' : 'bg-sage',
                    )} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's appointments ─────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            Записи на сегодня
          </h3>
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Все записи
          </Button>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Специалист</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Время</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {mockAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-charcoal/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={apt.client} size="sm" />
                      <span className="font-medium text-text-primary whitespace-nowrap">{apt.client}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {apt.category === 'massage'
                        ? <Leaf className="w-3.5 h-3.5 text-sage shrink-0" />
                        : <Sparkles className="w-3.5 h-3.5 text-champagne shrink-0" />}
                      <span className="text-text-secondary truncate max-w-[180px]">{apt.service}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap">{apt.specialist}</td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">{formatTime(apt.time)}</td>
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
                  <span className="font-medium text-text-primary text-sm truncate">{apt.client}</span>
                  <Badge variant={getAppointmentStatusBadgeVariant(apt.status)}>
                    {getAppointmentStatusLabel(apt.status)}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{apt.service}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-tertiary">{formatTime(apt.time)}</span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">{apt.specialist}</span>
                  <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(apt.amount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
