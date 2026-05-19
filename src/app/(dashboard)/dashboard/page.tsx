'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Plus,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTime, formatCurrency, getGreeting } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/context/auth-context';
import type { SerializedAppointment } from '@/lib/appointment-serializer';

interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  confirmedCount: number;
  totalClients: number;
}

function todayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const greeting = getGreeting();

  const [appointments, setAppointments] = React.useState<SerializedAppointment[]>([]);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = todayRange();
        const params = new URLSearchParams({ from, to, limit: '50', sortBy: 'startAt', sortOrder: 'asc' });

        const [aptsRes, clientsRes] = await Promise.all([
          apiFetch(`/api/appointments?${params}`),
          apiFetch('/api/customers?limit=1'),
        ]);

        if (cancelled) return;

        const aptsJson = await aptsRes.json();
        const clientsJson = await clientsRes.json();

        const items: SerializedAppointment[] = aptsJson.success
          ? (aptsJson.data?.items ?? [])
          : [];

        const totalClients: number = clientsJson.success
          ? (clientsJson.data?.total ?? 0)
          : 0;

        const pendingCount = items.filter(a => a.status === 'PENDING').length;
        const confirmedCount = items.filter(a => a.status === 'CONFIRMED').length;

        setAppointments(items);
        setStats({
          todayCount: items.length,
          pendingCount,
          confirmedCount,
          totalClients,
        });
      } catch {
        if (!cancelled) setError('Не удалось загрузить данные');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const userName = user ? `${user.firstName}` : 'Администратор';

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {greeting}, {userName}
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
            onClick={() => router.push('/bookings?view=timeline')}
          >
            Расписание
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

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Записи сегодня"
          value={loading ? '—' : (stats?.todayCount ?? 0)}
          subtitle={loading ? 'Загрузка...' : `${stats?.pendingCount ?? 0} ожидают подтверждения`}
          trend={undefined}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="Подтверждено"
          value={loading ? '—' : (stats?.confirmedCount ?? 0)}
          subtitle="на сегодня"
          trend={undefined}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Клиентов"
          value={loading ? '—' : (stats?.totalClients ?? 0)}
          subtitle="в базе"
          trend={undefined}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Ожидают"
          value={loading ? '—' : (stats?.pendingCount ?? 0)}
          subtitle="нужно подтвердить"
          trend={undefined}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Today's appointments */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            Записи на сегодня
            {!loading && appointments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-text-tertiary">· {appointments.length}</span>
            )}
          </h3>
          <Link href="/bookings">
            <Button variant="ghost" size="sm">
              Все записи →
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">
            Загрузка...
          </div>
        )}

        {!loading && appointments.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-text-primary font-medium">Записей на сегодня нет</p>
            <p className="text-text-tertiary text-sm">Создайте запись, чтобы она появилась здесь</p>
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => router.push('/bookings')}>
              Новая запись
            </Button>
          </div>
        )}

        {!loading && appointments.length > 0 && (
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
                          <Avatar name={apt.clientName} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">
                            {apt.clientName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">
                        {apt.serviceName}
                      </td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                        {apt.specialistName}
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
                        {formatCurrency(apt.totalPrice)}
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
                  className="px-4 py-4 flex items-start gap-3 cursor-pointer hover:bg-charcoal/30"
                  onClick={() => router.push('/bookings')}
                >
                  <Avatar name={apt.clientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">
                        {apt.clientName}
                      </span>
                      <Badge variant={getAppointmentStatusBadgeVariant(apt.status)}>
                        {getAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{apt.serviceName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-tertiary">{formatTime(new Date(apt.startAt))}</span>
                      <span className="text-xs text-text-tertiary">·</span>
                      <span className="text-xs text-text-tertiary">{apt.specialistName}</span>
                      <span className="text-xs font-medium text-champagne ml-auto">
                        {formatCurrency(apt.totalPrice)}
                      </span>
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
