export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star, Phone, Mail, Calendar, TrendingUp, Clock, Award } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/infrastructure/config/prisma-client';
import { formatCurrency } from '@/lib/utils';
import { ClientProfileTabs } from './_components/ClientProfileTabs';

function formatClientRef(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

const LOYALTY_LABEL: Record<string, string> = {
  BRONZE: 'Бронза', SILVER: 'Серебро', GOLD: 'Золото', PLATINUM: 'Платина', VIP: 'Бриллиант',
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

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, statusStats, topServiceRows, unpaidAgg, finProfile, upcomingAppts, recentVisits, latestNoteRaw] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: 'CLIENT' },
      include: {
        customerProfile: {
          include: { allergies: { take: 10 } },
        },
        clientAppointments: {
          include: {
            services: { include: { service: { select: { name: true } } } },
            specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
            location: { select: { name: true } },
          },
          orderBy: { startAt: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { clientId: id },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.appointmentService.groupBy({
      by: ['serviceId'],
      where: { appointment: { clientId: id } },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.appointment.aggregate({
      where: {
        clientId: id,
        paymentStatus: { in: ['UNPAID', 'PARTIAL_PAID', 'DEPOSIT_PAID', 'OVERDUE'] },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      _sum: { totalPrice: true, paidAmount: true },
    }),
    prisma.customerProfile.findUnique({
      where: { userId: id },
      select: { prepaidBalance: true },
    }),
    prisma.appointment.findMany({
      where: { clientId: id, startAt: { gte: new Date() }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      orderBy: { startAt: 'asc' },
      take: 3,
      include: {
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        location: { select: { name: true } },
        services: { include: { service: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.appointment.findMany({
      where: { clientId: id, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
      take: 5,
      include: {
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        services: { include: { service: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.customerProfile.findUnique({
      where: { userId: id },
      include: {
        specialistNotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { specialist: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
      },
    }),
  ]);

  if (!user) notFound();

  // Resolve service names for top services
  const serviceIds = topServiceRows.map((r) => r.serviceId);
  const serviceNames = serviceIds.length > 0
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
    : [];
  const serviceMap = new Map(serviceNames.map((s) => [s.id, s.name]));

  // Favorite specialist
  const specRows = await prisma.appointment.groupBy({
    by: ['specialistId'],
    where: { clientId: id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  });
  let favSpecialist: string | null = null;
  if (specRows[0]) {
    const sp = await prisma.specialist.findUnique({
      where: { id: specRows[0].specialistId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (sp) favSpecialist = `${sp.user.firstName} ${sp.user.lastName}`;
  }

  const profile = user.customerProfile;
  const appointments = user.clientAppointments;
  const totalSpent = profile ? Number(profile.totalSpent) : 0;
  const totalVisits = profile?.totalVisits ?? 0;
  const avgSpend = totalVisits > 0 ? Math.round(totalSpent / totalVisits) : 0;

  const lastVisit = profile?.lastVisitAt ?? appointments[0]?.startAt ?? null;
  const firstVisit = profile?.firstVisitAt ?? (appointments.length > 0 ? appointments[appointments.length - 1].startAt : null);

  const cancelledCount = statusStats.find((s) => s.status === 'CANCELLED')?._count.id ?? 0;
  const noShowCount = statusStats.find((s) => s.status === 'NO_SHOW')?._count.id ?? 0;
  const totalAll = statusStats.reduce((sum, s) => sum + s._count.id, 0);

  const unpaidBalance = Math.max(
    0,
    Number(unpaidAgg._sum.totalPrice ?? 0) - Number(unpaidAgg._sum.paidAmount ?? 0),
  );
  const prepaidBalance = Number(finProfile?.prepaidBalance ?? 0);

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Назад к клиентам
      </Link>

      {/* Hero */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl font-medium text-text-primary">
                {user.firstName} {user.lastName}
              </h2>
              {profile?.loyaltyTier && (
                <Badge variant={profile.loyaltyTier === 'GOLD' || profile.loyaltyTier === 'PLATINUM' || profile.loyaltyTier === 'VIP' ? 'gold' : 'default'}>
                  <Star className="w-3 h-3 mr-1" />
                  {LOYALTY_LABEL[profile.loyaltyTier] ?? profile.loyaltyTier}
                </Badge>
              )}
              <span className="text-xs font-mono text-champagne bg-champagne/10 px-2 py-0.5 rounded">
                {formatClientRef(user.id)}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              {user.email && (
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                  {user.phone}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
              {firstVisit && (
                <span>Первый визит: {new Date(firstVisit).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              {lastVisit && (
                <span>Последний визит: {new Date(lastVisit).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              {favSpecialist && <span>Любимый специалист: <span className="text-text-secondary">{favSpecialist}</span></span>}
            </div>
          </div>
        </div>

        {/* Notes / Allergies */}
        {(profile?.notes || (profile?.allergies?.length ?? 0) > 0) && (
          <div className="mt-4 pt-4 border-t border-border-luxury space-y-3">
            {profile?.notes && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Заметки</p>
                <p className="text-sm text-text-secondary">{profile.notes}</p>
              </div>
            )}
            {(profile?.allergies?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Аллергии</p>
                <div className="flex flex-wrap gap-2">
                  {profile!.allergies.map((a) => (
                    <span key={a.id} className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      {a.allergen} ({a.severity})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Всего визитов" value={totalVisits.toString()} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Потрачено" value={formatCurrency(totalSpent)} />
        <StatCard icon={<Award className="w-5 h-5" />} label="Средний чек" value={formatCurrency(avgSpend)} />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Отмены / Неявки"
          value={`${cancelledCount + noShowCount}`}
          sub={totalAll > 0 ? `${Math.round(((cancelledCount + noShowCount) / totalAll) * 100)}% от всех` : undefined}
        />
      </div>

      {/* Top services */}
      {topServiceRows.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-lg font-medium text-text-primary">Популярные услуги</h3>
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

      {/* Financial summary */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Финансовый профиль</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-charcoal rounded-xl p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Потрачено всего</p>
              <p className="text-xl font-semibold text-champagne tabular-nums">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="bg-charcoal rounded-xl p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Баланс предоплаты</p>
              <p className="text-xl font-semibold text-text-primary tabular-nums">{formatCurrency(prepaidBalance)}</p>
            </div>
            <div className="bg-charcoal rounded-xl p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Задолженность</p>
              <p className={`text-xl font-semibold tabular-nums ${unpaidBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {unpaidBalance > 0 ? formatCurrency(unpaidBalance) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile tabs */}
      <ClientProfileTabs
        clientId={id}
        overview={{
          clientId: id,
          upcomingBookings: upcomingAppts.map((a) => ({
            id: a.id,
            startAt: a.startAt.toISOString(),
            endAt: a.endAt.toISOString(),
            status: a.status,
            specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
            serviceName: a.services[0]?.service.name ?? '',
            locationName: a.location.name,
            totalPrice: Number(a.totalPrice),
          })),
          recentVisits: recentVisits.map((a) => ({
            id: a.id,
            startAt: a.startAt.toISOString(),
            status: a.status,
            specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
            serviceName: a.services[0]?.service.name ?? '',
            totalPrice: Number(a.totalPrice),
          })),
          latestNote: latestNoteRaw?.specialistNotes[0]
            ? {
                content: latestNoteRaw.specialistNotes[0].content,
                specialistName: `${latestNoteRaw.specialistNotes[0].specialist.user.firstName} ${latestNoteRaw.specialistNotes[0].specialist.user.lastName}`,
                createdAt: latestNoteRaw.specialistNotes[0].createdAt.toISOString(),
              }
            : null,
        }}
      />
    </div>
  );
}
