import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Calendar,
  TrendingUp,
  Users,
  Plus,
  UserPlus,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatTime, formatCurrency, getGreeting } from '@/lib/utils';
import { prisma } from '@/infrastructure/config/prisma-client';
import { UIPageWrapper } from '@/next-ui/components/UIPageWrapper';
import { NextDashboard } from '@/next-ui/dashboard/NextDashboard';
import jwt from 'jsonwebtoken';

async function getCurrentUserName(): Promise<string> {
  try {
    const store = await cookies();
    const token = store.get('access_token')?.value;
    if (!token) return '';
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
    const payload = jwt.verify(token, secret) as { sub?: string };
    if (!payload.sub) return '';
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { firstName: true } });
    return user?.firstName ?? '';
  } catch {
    return '';
  }
}

async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [
    todayCount,
    pendingCount,
    monthRevenue,
    prevMonthRevenue,
    totalClients,
    prevMonthClients,
    todayList,
  ] = await Promise.all([
    prisma.appointment.count({ where: { startAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.appointment.count({ where: { startAt: { gte: todayStart, lte: todayEnd }, status: 'PENDING' } }),
    prisma.appointment.aggregate({ where: { startAt: { gte: monthStart }, status: 'COMPLETED' }, _sum: { totalPrice: true } }),
    prisma.appointment.aggregate({ where: { startAt: { gte: prevMonthStart, lte: prevMonthEnd }, status: 'COMPLETED' }, _sum: { totalPrice: true } }),
    prisma.customerProfile.count(),
    prisma.customerProfile.count({ where: { createdAt: { lt: monthStart } } }),
    prisma.appointment.findMany({
      where: { startAt: { gte: todayStart, lte: todayEnd } },
      include: {
        client: { select: { firstName: true, lastName: true } },
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        services: { include: { service: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { startAt: 'asc' },
      take: 20,
    }),
  ]);

  const revMonth = Number(monthRevenue._sum.totalPrice ?? 0);
  const revPrevMonth = Number(prevMonthRevenue._sum.totalPrice ?? 0);
  const revTrend = revPrevMonth > 0 ? Math.round(((revMonth - revPrevMonth) / revPrevMonth) * 100) : 0;

  const appointments = todayList.map((a) => ({
    id: a.id,
    client: `${a.client.firstName} ${a.client.lastName}`,
    service: a.services[0]?.service.name ?? '—',
    specialist: `${a.specialist.user.firstName} ${a.specialist.user.lastName.charAt(0)}.`,
    time: a.startAt,
    status: a.status,
    amount: Number(a.totalPrice),
  }));

  return {
    todayBookings: todayCount,
    pendingCount,
    revenueMtd: revMonth,
    revenueTrend: revTrend,
    totalClients,
    newClientsThisMonth: totalClients - prevMonthClients,
    appointments,
  };
}

function LegacyDashboardContent({ data, greeting, userName }: { data: Awaited<ReturnType<typeof getDashboardData>>; greeting: string; userName: string }) {
  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {greeting}{userName ? `, ${userName}` : ''}
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Вот что происходит в вашей студии сегодня
          </p>
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
            Запись
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Link href="/bookings" className="block hover:scale-[1.01] transition-transform">
          <StatCard
            title="Записи сегодня"
            value={data.todayBookings}
            subtitle={`${data.pendingCount} ожидают подтверждения`}
            icon={<Calendar className="w-5 h-5" />}
          />
        </Link>
        <Link href="/analytics" className="block hover:scale-[1.01] transition-transform">
          <StatCard
            title="Выручка за месяц"
            value={formatCurrency(data.revenueMtd)}
            subtitle="завершённые записи"
            trend={data.revenueTrend !== 0 ? { value: Math.abs(data.revenueTrend), positive: data.revenueTrend >= 0, label: 'vs пред. месяц' } : undefined}
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </Link>
        <Link href="/clients" className="block hover:scale-[1.01] transition-transform sm:col-span-2 xl:col-span-1">
          <StatCard
            title="Активные клиенты"
            value={data.totalClients}
            subtitle={`+${data.newClientsThisMonth} за этот месяц`}
            icon={<Users className="w-5 h-5" />}
          />
        </Link>
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Записи на сегодня</h3>
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
              <Plus className="w-4 h-4" />
              Создать запись
            </Link>
          </div>
        ) : (
          <>
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
                    <tr key={apt.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={apt.client} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">{apt.client}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">{apt.service}</td>
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

            <div className="sm:hidden divide-y divide-border-luxury">
              {data.appointments.map((apt) => (
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
          </>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [data, userName] = await Promise.all([getDashboardData(), getCurrentUserName()]);
  const greeting = getGreeting();
  return (
    <UIPageWrapper
      legacy={<LegacyDashboardContent data={data} greeting={greeting} userName={userName} />}
      next={<NextDashboard data={data} />}
    />
  );
}
