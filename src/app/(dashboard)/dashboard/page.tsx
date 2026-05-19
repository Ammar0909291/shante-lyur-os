'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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

interface Appointment {
  id: string;
  clientName?: string;
  clientId: string;
  specialistName?: string;
  specialistId: string;
  startAt: string;
  status: string;
  totalAmount?: number;
  services?: { name?: string }[];
}

interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  monthRevenue: number;
  totalClients: number;
}

interface AppointmentsApiResponse {
  success: boolean;
  data: { items: Appointment[]; total: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const greeting = getGreeting();

  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const today = new Date();
        const from = new Date(today);
        from.setHours(0, 0, 0, 0);
        const to = new Date(today);
        to.setHours(23, 59, 59, 999);

        const params = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
          limit: '20',
          page: '1',
        });

        const res = await fetch(`/api/appointments?${params}`, { credentials: 'include' });
        const json: AppointmentsApiResponse = await res.json();
        if (json.success) {
          const items = json.data.items;
          setAppointments(items);
          const pendingCount = items.filter((a) => a.status === 'PENDING').length;
          setStats({
            todayCount: json.data.total,
            pendingCount,
            monthRevenue: 0,
            totalClients: 0,
          });
        }
      } catch {
        // silently fail — show whatever loaded
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Clock className="w-4 h-4" />}
            onClick={() => router.push('/specialists')}
          >
            Заблокировать время
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => router.push('/clients')}
          >
            Клиент
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => router.push('/bookings')}
          >
            Запись
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Записи сегодня"
          value={loading ? '...' : (stats?.todayCount ?? 0)}
          subtitle={
            loading
              ? 'Загрузка...'
              : stats?.pendingCount
              ? `${stats.pendingCount} ожидают подтверждения`
              : 'Нет ожидающих'
          }
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="Выручка за месяц"
          value={loading ? '...' : formatCurrency(stats?.monthRevenue ?? 0)}
          subtitle="за текущий месяц"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Активные клиенты"
          value={loading ? '...' : (stats?.totalClients ?? '—')}
          subtitle="всего в базе"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Средний рейтинг"
          value="—"
          subtitle="данные недоступны"
          icon={<Star className="w-5 h-5" />}
        />
      </div>

      {/* Today's appointments */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            Записи на сегодня
          </h3>
          <Button variant="ghost" size="sm" onClick={() => router.push('/bookings')}>
            Все записи →
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-tertiary">
            <span className="animate-pulse">Загрузка...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Calendar className="w-10 h-10 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">Записей на сегодня нет</p>
          </div>
        ) : (
          <>
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
                  {appointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="hover:bg-charcoal/50 transition-colors cursor-pointer"
                      onClick={() => router.push('/bookings')}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={apt.clientName ?? 'К'} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">
                            {apt.clientName ?? apt.clientId.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">
                        {apt.services?.[0]?.name ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                        {apt.specialistName ?? apt.specialistId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">
                        {formatTime(new Date(apt.startAt))}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                          {getAppointmentStatusLabel(apt.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                        {apt.totalAmount != null ? formatCurrency(apt.totalAmount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-border-luxury">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="px-4 py-4 flex items-start gap-3"
                  onClick={() => router.push('/bookings')}
                >
                  <Avatar name={apt.clientName ?? 'К'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">
                        {apt.clientName ?? apt.clientId.slice(0, 8)}
                      </span>
                      <Badge variant={getAppointmentStatusBadgeVariant(apt.status)}>
                        {getAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {apt.services?.[0]?.name ?? '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-tertiary">
                        {formatTime(new Date(apt.startAt))}
                      </span>
                      <span className="text-xs text-text-tertiary">·</span>
                      <span className="text-xs text-text-tertiary">
                        {apt.specialistName ?? apt.specialistId.slice(0, 8)}
                      </span>
                      {apt.totalAmount != null && (
                        <span className="text-xs font-medium text-champagne ml-auto">
                          {formatCurrency(apt.totalAmount)}
                        </span>
                      )}
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
