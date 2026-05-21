import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star, Calendar, TrendingUp, Award, Clock } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { prisma } from '@/infrastructure/config/prisma-client';
import { formatCurrency } from '@/lib/utils';
import { SpecialistEditClient } from '../_components/SpecialistEditClient';
const SPEC_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен', ON_VACATION: 'Отпуск', INACTIVE: 'Неактивен', TERMINATED: 'Уволен',
};

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="p-2.5 rounded-xl bg-champagne/10 text-champagne w-fit mb-3">{icon}</div>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function SpecialistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!specialist) notFound();

  const [revenueAgg, allStatusStats, topServiceRows, recentAppointments] = await Promise.all([
    prisma.appointment.aggregate({
      where: { specialistId: id, status: 'COMPLETED' },
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { specialistId: id },
      _count: { id: true },
    }),
    prisma.appointmentService.groupBy({
      by: ['serviceId'],
      where: { appointment: { specialistId: id, status: 'COMPLETED' } },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: { specialistId: id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        services: { include: { service: { select: { name: true } } } },
        location: { select: { name: true } },
      },
      orderBy: { startAt: 'desc' },
      take: 20,
    }),
  ]);

  // Resolve service names
  const serviceIds = topServiceRows.map((r) => r.serviceId);
  const serviceNames = serviceIds.length > 0
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
    : [];
  const serviceMap = new Map(serviceNames.map((s) => [s.id, s.name]));

  const totalRevenue = Number(revenueAgg._sum.totalPrice ?? 0);
  const completedCount = revenueAgg._count.id;
  const totalAll = allStatusStats.reduce((sum, s) => sum + s._count.id, 0);
  const avgCheck = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

  // Employment duration
  const startDate = specialist.createdAt;
  const daysSince = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const monthsSince = Math.floor(daysSince / 30);

  const isActive = specialist.status === 'ACTIVE';

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Back */}
      <Link href="/specialists" className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Назад к специалистам
      </Link>

      {/* Hero */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="relative shrink-0">
            <Avatar name={`${specialist.user.firstName} ${specialist.user.lastName}`} size="lg" />
            {specialist.color && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-onyx"
                style={{ backgroundColor: specialist.color }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl font-medium text-text-primary">
                {specialist.user.firstName} {specialist.user.lastName}
              </h2>
              <Badge variant={isActive ? ('success' as const) : ('default' as const)} dot>
                {SPEC_STATUS_LABEL[specialist.status] ?? specialist.status}
              </Badge>
              <SpecialistEditClient
                specialist={{
                  id: specialist.id,
                  firstName: specialist.user.firstName,
                  lastName: specialist.user.lastName,
                  phone: specialist.user.phone ?? null,
                  specialization: specialist.specialization,
                  bio: specialist.bio,
                  experienceYears: specialist.experienceYears,
                  status: specialist.status,
                  color: specialist.color,
                }}
              />
            </div>

            {specialist.specialization && (
              <p className="text-text-secondary mt-1">{specialist.specialization}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
              {specialist.experienceYears !== null && (
                <span>Опыт: <span className="text-text-secondary">{specialist.experienceYears} лет</span></span>
              )}
              {specialist.rating !== null && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-champagne" />
                  <span className="text-champagne font-medium">{Number(specialist.rating).toFixed(1)}</span>
                  <span>({specialist.reviewCount} отзывов)</span>
                </span>
              )}
              <span>В команде: <span className="text-text-secondary">{monthsSince} мес.</span></span>
            </div>

            {specialist.bio && (
              <p className="text-sm text-text-secondary mt-3 leading-relaxed">{specialist.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Всего записей" value={totalAll.toString()} />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Завершено"
          value={completedCount.toString()}
          sub={totalAll > 0 ? `${Math.round((completedCount / totalAll) * 100)}% конверсия` : undefined}
        />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Выручка" value={formatCurrency(totalRevenue)} sub="завершённые" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Средний чек" value={formatCurrency(avgCheck)} />
      </div>

      {/* Top services */}
      {topServiceRows.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-lg font-medium text-text-primary">Топ услуги</h3>
            <p className="text-xs text-text-tertiary mt-0.5">По количеству оказаний</p>
          </div>
          <div className="divide-y divide-border-luxury">
            {topServiceRows.map((r, i) => (
              <div key={r.serviceId} className="flex items-center gap-4 px-6 py-3.5">
                <span className="text-sm font-medium text-text-tertiary tabular-nums w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{serviceMap.get(r.serviceId) ?? 'Услуга'}</p>
                  <p className="text-xs text-text-tertiary">{r._count.id} раз</p>
                </div>
                <span className="text-sm font-semibold text-champagne tabular-nums">{formatCurrency(Number(r._sum.price ?? 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      {allStatusStats.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-lg font-medium text-text-primary">По статусам</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border-luxury">
            {allStatusStats.map((s) => (
              <div key={s.status} className="bg-onyx px-5 py-4">
                <p className="text-lg font-semibold text-text-primary tabular-nums">{s._count.id}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{getAppointmentStatusLabel(s.status)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent appointments */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Последние записи</h3>
          <p className="text-xs text-text-tertiary mt-0.5">{recentAppointments.length} из {totalAll}</p>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-tertiary">Записей нет</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Дата</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {recentAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-3.5 text-text-secondary tabular-nums whitespace-nowrap">
                        {new Date(a.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 text-text-primary whitespace-nowrap">
                        {a.client.firstName} {a.client.lastName}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary max-w-[160px] truncate">
                        {a.services[0]?.service.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={getAppointmentStatusBadgeVariant(a.status)} dot>
                          {getAppointmentStatusLabel(a.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                        {formatCurrency(Number(a.totalPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-border-luxury">
              {recentAppointments.map((a) => (
                <div key={a.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{a.client.firstName} {a.client.lastName}</p>
                    <Badge variant={getAppointmentStatusBadgeVariant(a.status)} dot>
                      {getAppointmentStatusLabel(a.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">
                      {new Date(a.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary truncate">{a.services[0]?.service.name ?? '—'}</span>
                    <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(Number(a.totalPrice))}</span>
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
