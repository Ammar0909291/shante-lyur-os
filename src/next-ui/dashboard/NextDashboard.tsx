'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar, TrendingUp, Users, Plus, UserPlus,
  Clock, ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatTime, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

interface Appointment {
  id: string;
  client: string;
  service: string;
  specialist: string;
  time: Date;
  status: string;
  amount: number;
}

interface DashboardData {
  todayBookings: number;
  pendingCount: number;
  revenueMtd: number;
  revenueTrend: number;
  totalClients: number;
  newClientsThisMonth: number;
  appointments: Appointment[];
}

interface KPICardProps {
  title: string;
  value: string | number;
  sub: string;
  trend?: number;
  icon: React.ReactNode;
  href: string;
  accent?: boolean;
}

function KPICard({ title, value, sub, trend, icon, href, accent }: KPICardProps) {
  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-5 transition-all duration-200',
          'hover:border-champagne/30 hover:shadow-champagne-sm',
          accent
            ? 'bg-champagne/5 border-champagne/20'
            : 'bg-onyx border-border-luxury',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">{title}</p>
            <p className={cn(
              'font-serif text-2xl font-medium tracking-tight',
              accent ? 'text-champagne' : 'text-text-primary',
            )}>
              {value}
            </p>
            <p className="text-xs text-text-secondary mt-1.5">{sub}</p>

            {trend !== undefined && trend !== 0 && (
              <div className={cn(
                'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium',
                trend > 0
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400',
              )}>
                {trend > 0
                  ? <ArrowUpRight className="w-3 h-3" />
                  : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend)}% vs прошлый месяц
              </div>
            )}
          </div>

          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            'transition-transform duration-200 group-hover:scale-110',
            accent ? 'bg-champagne/15 text-champagne' : 'bg-charcoal text-text-secondary',
          )}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  return (
    <Badge variant={getAppointmentStatusBadgeVariant(status)} dot>
      {getAppointmentStatusLabel(status, t)}
    </Badge>
  );
}

export function NextDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-champagne" />
            <span className="text-xs text-champagne uppercase tracking-widest font-medium">Операционный центр</span>
          </div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Обзор студии
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-charcoal text-text-primary border border-border-luxury hover:border-border-light hover:bg-charcoal/80 transition-all"
          >
            <Clock className="w-4 h-4" />
            Расписание
          </Link>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-charcoal text-text-primary border border-border-luxury hover:border-border-light hover:bg-charcoal/80 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Клиенты
          </Link>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Новая запись
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Записи сегодня"
          value={data.todayBookings}
          sub={`${data.pendingCount} ожидают подтверждения`}
          icon={<Calendar className="w-5 h-5" />}
          href="/bookings"
        />
        <KPICard
          title="Выручка за месяц"
          value={formatCurrency(data.revenueMtd)}
          sub="завершённые записи"
          trend={data.revenueTrend}
          icon={<TrendingUp className="w-5 h-5" />}
          href="/analytics"
          accent
        />
        <KPICard
          title="Активные клиенты"
          value={data.totalClients}
          sub={`+${data.newClientsThisMonth} за этот месяц`}
          icon={<Users className="w-5 h-5" />}
          href="/clients"
        />
      </div>

      {/* Today's schedule */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-lg font-medium text-text-primary">Записи на сегодня</h3>
            {data.appointments.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-champagne/10 text-champagne border border-champagne/20">
                {data.appointments.length}
              </span>
            )}
          </div>
          <Link href="/bookings" className="text-xs text-champagne hover:text-champagne-light transition-colors">
            Все записи →
          </Link>
        </div>

        {data.appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Calendar className="w-10 h-10 text-text-tertiary" />
            <p className="text-text-secondary text-sm">На сегодня записей нет</p>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all"
            >
              <Plus className="w-4 h-4" />Создать запись
            </Link>
          </div>
        ) : (
          <>
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
                  {data.appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-charcoal/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={apt.client} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">{apt.client}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">{apt.service}</td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap">{apt.specialist}</td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">{formatTime(apt.time)}</td>
                      <td className="px-4 py-4"><StatusPill status={apt.status} /></td>
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
              {data.appointments.map((apt) => (
                <div key={apt.id} className="px-4 py-4 flex items-start gap-3">
                  <Avatar name={apt.client} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">{apt.client}</span>
                      <StatusPill status={apt.status} />
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
          </>
        )}
      </div>
    </div>
  );
}
