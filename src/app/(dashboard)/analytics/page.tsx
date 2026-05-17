'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

// Mock revenue data
const revenueData = [
  { month: 'Дек', revenue: 185_00000, bookings: 142 },
  { month: 'Янв', revenue: 162_00000, bookings: 128 },
  { month: 'Фев', revenue: 198_00000, bookings: 156 },
  { month: 'Мар', revenue: 224_00000, bookings: 178 },
  { month: 'Апр', revenue: 215_00000, bookings: 169 },
  { month: 'Май', revenue: 248_00000, bookings: 192 },
];

// Specialist performance
const specialistData = [
  { name: 'Мария Петрова', bookings: 68, revenue: 98_00000, rating: 4.9, services: ['Косметология', 'Уход'] },
  { name: 'Ольга Климова', bookings: 54, revenue: 82_00000, rating: 4.8, services: ['Лазер', 'Эпиляция'] },
  { name: 'Дарья Светлова', bookings: 41, revenue: 74_00000, rating: 5.0, services: ['Инъекции', 'Биорев'] },
  { name: 'Наталья Волкова', bookings: 38, revenue: 52_00000, rating: 4.7, services: ['Массаж', 'Тело'] },
];

// Top services
const servicesData = [
  { name: 'Гиалуроновый лифтинг', revenue: 48_00000, count: 40, growth: 12 },
  { name: 'Биоревитализация', revenue: 36_00000, count: 20, growth: 8 },
  { name: 'Лазерная эпиляция', revenue: 45_00000, count: 30, growth: -3 },
  { name: 'Антивозрастной массаж', revenue: 28_00000, count: 35, growth: 22 },
  { name: 'Пилинг & Детокс', revenue: 22_00000, count: 34, growth: 15 },
];

// Booking funnel
const funnelData = [
  { label: 'Просмотры услуг', value: 1240, pct: 100, color: '#D4AF7A' },
  { label: 'Начали бронирование', value: 480, pct: 39, color: '#E8D4A8' },
  { label: 'Подтвердили запись', value: 320, pct: 26, color: '#8BA888' },
  { label: 'Посетили студию', value: 285, pct: 23, color: '#B8A8D4' },
];

// Booking status distribution
const statusDistribution = [
  { name: 'Завершено', value: 192, color: '#8BA888' },
  { name: 'Подтверждено', value: 48, color: '#7898C4' },
  { name: 'Ожидание', value: 24, color: '#D4AF7A' },
  { name: 'Отменено', value: 18, color: '#C47878' },
  { name: 'Не явился', value: 8, color: '#6A6560' },
];

const dateRanges = ['7 дней', '30 дней', '3 месяца', '6 месяцев', 'Год'];

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-onyx border border-border-luxury rounded-xl px-4 py-3 shadow-luxury-lg">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-medium text-text-primary">
            {entry.name === 'Выручка' ? formatCurrency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState('6 месяцев');

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
            Аналитика
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Показатели эффективности студии
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-1 bg-onyx border border-border-luxury rounded-xl p-1">
          <CalendarDays className="w-4 h-4 text-text-tertiary ml-2" aria-hidden="true" />
          {dateRanges.map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                dateRange === range
                  ? 'bg-champagne/10 text-champagne'
                  : 'text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Выручка за период"
          value={formatCurrency(248_00000)}
          subtitle="Текущий месяц"
          trend={{ value: 14, positive: true, label: 'vs пред. период' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Конверсия записей"
          value="89%"
          subtitle="Confirmed / Total"
          trend={{ value: 3, positive: true, label: 'vs пред. период' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Средний чек"
          value={formatCurrency(1_29000)}
          subtitle="За процедуру"
          trend={{ value: 7, positive: true, label: 'vs пред. период' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Процент отмен"
          value="6.2%"
          subtitle="От всех записей"
          trend={{ value: 1.5, positive: false, label: 'vs пред. период' }}
          icon={<TrendingDown className="w-5 h-5" />}
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-serif text-lg font-medium text-text-primary">Динамика выручки</h3>
            <p className="text-sm text-text-secondary mt-0.5">Выручка и количество записей по месяцам</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF7A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#D4AF7A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8BA888" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#8BA888" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6A6560', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6A6560', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 100000).toFixed(0)}к`}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                stroke="#D4AF7A"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ fill: '#D4AF7A', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#D4AF7A', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specialist performance */}
        <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-lg font-medium text-text-primary">Специалисты</h3>
            <Badge variant="default">Топ 4</Badge>
          </div>
          <div className="space-y-4">
            {specialistData.map((spec, i) => {
              const maxRevenue = specialistData[0]?.revenue ?? 1;
              const pct = Math.round((spec.revenue / maxRevenue) * 100);
              return (
                <div key={spec.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-tertiary w-4">#{i + 1}</span>
                      <span className="text-sm font-medium text-text-primary">{spec.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-text-secondary">{spec.bookings} зап.</span>
                      <span className="font-medium text-champagne">{formatCurrency(spec.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full luxury-gradient transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top services */}
        <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-lg font-medium text-text-primary">Топ услуги</h3>
            <Badge variant="default">По выручке</Badge>
          </div>
          <div className="space-y-3">
            {servicesData.map((svc, i) => (
              <div
                key={svc.name}
                className="flex items-center gap-3 py-2 border-b border-border-luxury last:border-0"
              >
                <span className="text-xs font-bold text-text-tertiary w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{svc.name}</p>
                  <p className="text-xs text-text-tertiary">{svc.count} процедур</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      'text-xs font-semibold flex items-center gap-0.5',
                      svc.growth >= 0 ? 'text-sage' : 'text-red-400',
                    )}
                  >
                    {svc.growth >= 0 ? '+' : ''}{svc.growth}%
                  </span>
                  <span className="font-medium text-champagne text-sm whitespace-nowrap">
                    {formatCurrency(svc.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking funnel */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="mb-5">
          <h3 className="font-serif text-lg font-medium text-text-primary">Воронка записей</h3>
          <p className="text-sm text-text-secondary mt-0.5">От просмотра до визита</p>
        </div>
        <div className="space-y-3">
          {funnelData.map((step) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className="w-40 shrink-0 text-sm text-text-secondary truncate">{step.label}</div>
              <div className="flex-1 h-8 bg-charcoal rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                  style={{
                    width: `${step.pct}%`,
                    backgroundColor: step.color,
                    opacity: 0.75,
                  }}
                />
                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-text-primary">
                  {step.value.toLocaleString('ru-RU')}
                </span>
              </div>
              <div className="w-12 text-right text-sm font-medium text-text-secondary shrink-0">
                {step.pct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status distribution pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-onyx border border-border-luxury rounded-2xl p-6">
          <h3 className="font-serif text-lg font-medium text-text-primary mb-5">
            Распределение статусов
          </h3>
          <div className="flex flex-col items-center">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-2 space-y-2">
              {statusDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-text-secondary">{entry.name}</span>
                  </div>
                  <span className="font-medium text-text-primary tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly bookings bar chart */}
        <div className="lg:col-span-2 bg-onyx border border-border-luxury rounded-2xl p-6">
          <h3 className="font-serif text-lg font-medium text-text-primary mb-5">
            Записи по месяцам
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barSize={32} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6A6560', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6A6560', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-onyx border border-border-luxury rounded-xl px-4 py-3 shadow-luxury-lg">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">{label}</p>
                        <p className="text-sm text-text-primary font-medium">{payload[0]?.value} записей</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="bookings" name="Записи" radius={[4, 4, 0, 0]}>
                  {revenueData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === revenueData.length - 1 ? '#D4AF7A' : '#2A2A38'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
