'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Calendar, TrendingUp, Award, Clock } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { SpecialistEditClient } from '../_components/SpecialistEditClient';
import { useLanguage } from '@/contexts/language';

// ─── Serializable prop types ──────────────────────────────────────────────────

export interface SpecialistDisplayProps {
  specialist: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    specialization: string | null;
    bio: string | null;
    experienceYears: number | null;
    rating: number | null;
    reviewCount: number;
    status: string;
    color: string | null;
  };
  stats: {
    totalAll: number;
    completedCount: number;
    totalRevenue: number;
    avgCheck: number;
    monthsSince: number;
  };
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
    totalPrice: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  recentAppointments: Array<{
    id: string;
    startAt: string;
    totalPrice: number;
    clientFirstName: string;
    clientLastName: string;
    firstServiceName: string | null;
    status: string;
  }>;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

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

// ─── Display component ────────────────────────────────────────────────────────

export function SpecialistProfileDisplay({
  specialist,
  stats,
  topServices,
  statusBreakdown,
  recentAppointments,
}: SpecialistDisplayProps) {
  const { t } = useLanguage();

  const SPEC_STATUS_LABEL: Record<string, string> = {
    ACTIVE: t('specialists.status.active'),
    ON_VACATION: t('specialists.status.vacation'),
    INACTIVE: t('specialists.status.inactive'),
    TERMINATED: t('specialists.status.dismissed'),
  };

  const isActive = specialist.status === 'ACTIVE';
  const { totalAll, completedCount, totalRevenue, avgCheck, monthsSince } = stats;

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Back */}
      <Link href="/specialists" className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('specialists.profile.back')}
      </Link>

      {/* Hero */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="relative shrink-0">
            <Avatar name={`${specialist.firstName} ${specialist.lastName}`} size="lg" />
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
                {specialist.firstName} {specialist.lastName}
              </h2>
              <Badge variant={isActive ? ('success' as const) : ('default' as const)} dot>
                {SPEC_STATUS_LABEL[specialist.status] ?? specialist.status}
              </Badge>
              <SpecialistEditClient
                specialist={{
                  id: specialist.id,
                  firstName: specialist.firstName,
                  lastName: specialist.lastName,
                  phone: specialist.phone,
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
                <span>{t('specialists.experience').replace('{n}', String(specialist.experienceYears))}</span>
              )}
              {specialist.rating !== null && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-champagne" />
                  <span className="text-champagne font-medium">{Number(specialist.rating).toFixed(1)}</span>
                  <span>({specialist.reviewCount} {t('specialists.profile.reviews')})</span>
                </span>
              )}
              <span>{t('specialists.profile.inTeam')}: <span className="text-text-secondary">{monthsSince} {t('specialists.profile.months')}</span></span>
            </div>

            {specialist.bio && (
              <p className="text-sm text-text-secondary mt-3 leading-relaxed">{specialist.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label={t('specialists.profile.stat.totalBookings')} value={totalAll.toString()} />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label={t('specialists.profile.stat.completed')}
          value={completedCount.toString()}
          sub={totalAll > 0 ? `${Math.round((completedCount / totalAll) * 100)}${t('specialists.profile.stat.conversion')}` : undefined}
        />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t('specialists.profile.stat.revenue')} value={formatCurrency(totalRevenue)} sub={t('specialists.profile.stat.revenueCompleted')} />
        <StatCard icon={<Clock className="w-5 h-5" />} label={t('specialists.profile.stat.avgCheck')} value={formatCurrency(avgCheck)} />
      </div>

      {/* Top services */}
      {topServices.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-lg font-medium text-text-primary">{t('specialists.profile.topServices')}</h3>
            <p className="text-xs text-text-tertiary mt-0.5">{t('specialists.profile.topServicesSub')}</p>
          </div>
          <div className="divide-y divide-border-luxury">
            {topServices.map((r, i) => (
              <div key={r.serviceId} className="flex items-center gap-4 px-6 py-3.5">
                <span className="text-sm font-medium text-text-tertiary tabular-nums w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.serviceName}</p>
                  <p className="text-xs text-text-tertiary">{r.count} {t('specialists.profile.times')}</p>
                </div>
                <span className="text-sm font-semibold text-champagne tabular-nums">{formatCurrency(r.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      {statusBreakdown.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-lg font-medium text-text-primary">{t('specialists.profile.byStatus')}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border-luxury">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="bg-onyx px-5 py-4">
                <p className="text-lg font-semibold text-text-primary tabular-nums">{s.count}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{getAppointmentStatusLabel(s.status)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent appointments */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">{t('specialists.profile.recentAppointments')}</h3>
          <p className="text-xs text-text-tertiary mt-0.5">{recentAppointments.length} / {totalAll}</p>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-tertiary">{t('specialists.profile.noAppointments')}</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('specialists.profile.col.date')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('specialists.profile.col.client')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('specialists.profile.col.service')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('specialists.profile.col.status')}</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('specialists.profile.col.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {recentAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-3.5 text-text-secondary tabular-nums whitespace-nowrap">
                        {new Date(a.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 text-text-primary whitespace-nowrap">
                        {a.clientFirstName} {a.clientLastName}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary max-w-[160px] truncate">
                        {a.firstServiceName ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={getAppointmentStatusBadgeVariant(a.status)} dot>
                          {getAppointmentStatusLabel(a.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                        {formatCurrency(a.totalPrice)}
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
                    <p className="text-sm font-medium text-text-primary">{a.clientFirstName} {a.clientLastName}</p>
                    <Badge variant={getAppointmentStatusBadgeVariant(a.status)} dot>
                      {getAppointmentStatusLabel(a.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">
                      {new Date(a.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary truncate">{a.firstServiceName ?? '—'}</span>
                    <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(a.totalPrice)}</span>
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
