'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Phone, Mail, Calendar, TrendingUp, Clock, Award, Bot, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { formatCurrency, formatClientRef } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { ClientActions } from '../_components/ClientActions';
import { ClientEditClient } from '../_components/ClientEditClient';

export interface ClientDisplayAppointment {
  id: string;
  startAt: string;
  status: string;
  totalPrice: number;
  serviceName: string | null;
  specialistFirstName: string;
  specialistLastName: string;
}

export interface ClientDisplayProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: string;
  };
  profile: {
    loyaltyTier: string | null;
    notes: string | null;
    allergies: Array<{ id: string; allergen: string; severity: string }>;
    totalSpent: number;
    totalVisits: number;
  } | null;
  commPref: {
    telegramChatId: string | null;
    telegramEnabled: boolean;
    whatsappPhone: string | null;
    whatsappEnabled: boolean;
  } | null;
  computed: {
    totalSpent: number;
    totalVisits: number;
    avgSpend: number;
    cancelledCount: number;
    noShowCount: number;
    totalAll: number;
    unpaidBalance: number;
    prepaidBalance: number;
    isHighValue: boolean;
    firstVisit: string | null;
    lastVisit: string | null;
    favSpecialist: string | null;
  };
  topServices: Array<{
    serviceId: string;
    serviceName: string | null;
    count: number;
    total: number;
  }>;
  appointments: ClientDisplayAppointment[];
}

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

const LOYALTY_VARIANT: Record<string, 'default' | 'gold' | 'success' | 'info'> = {
  BRONZE: 'default', SILVER: 'default', GOLD: 'gold', PLATINUM: 'gold', VIP: 'success',
};

export function ClientProfileDisplay({ user, profile, commPref, computed, topServices, appointments }: ClientDisplayProps) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  const LOYALTY_LABEL: Record<string, string> = {
    BRONZE: t('clients.loyalty.bronze'),
    SILVER: t('clients.loyalty.silver'),
    GOLD: t('clients.loyalty.gold'),
    PLATINUM: t('clients.loyalty.platinum'),
    VIP: t('clients.loyalty.diamond'),
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('clients.backToClients')}
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
                <Badge variant={LOYALTY_VARIANT[profile.loyaltyTier] ?? 'default'}>
                  <Star className="w-3 h-3 mr-1" />
                  {LOYALTY_LABEL[profile.loyaltyTier] ?? profile.loyaltyTier}
                </Badge>
              )}
              <span className="text-xs font-mono text-champagne bg-champagne/10 px-2 py-0.5 rounded">
                {formatClientRef(user.id)}
              </span>
              {user.status !== 'ACTIVE' && (
                <Badge variant="warning">
                  {user.status === 'INACTIVE' ? t('clients.status.inactive') : t('clients.status.archived')}
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <ClientActions clientId={user.id} currentStatus={user.status} />
              <ClientEditClient
                client={{
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  phone: user.phone ?? null,
                  notes: profile?.notes ?? null,
                  telegramChatId: commPref?.telegramChatId ?? null,
                  whatsappEnabled: commPref?.whatsappEnabled ?? false,
                }}
              />
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
              {commPref?.whatsappEnabled && commPref?.whatsappPhone ? (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp on
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-text-tertiary">
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp off
                </span>
              )}
              {commPref?.telegramEnabled && commPref?.telegramChatId ? (
                <span className="flex items-center gap-1.5 text-sm text-blue-400">
                  <Bot className="w-3.5 h-3.5" />
                  Telegram: <span className="font-mono text-xs bg-blue-500/10 px-1.5 py-0.5 rounded">{commPref.telegramChatId}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-text-tertiary">
                  <Bot className="w-3.5 h-3.5" />
                  No Telegram
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
              {computed.firstVisit && (
                <span>{t('clients.firstVisit')}: {new Date(computed.firstVisit).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              {computed.lastVisit && (
                <span>{t('clients.lastVisit')}: {new Date(computed.lastVisit).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              {computed.favSpecialist && (
                <span>{t('clients.favSpecialist')}: <span className="text-text-secondary">{computed.favSpecialist}</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Notes / Allergies */}
        {(profile?.notes || (profile?.allergies?.length ?? 0) > 0) && (
          <div className="mt-4 pt-4 border-t border-border-luxury space-y-3">
            {profile?.notes && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">{t('clients.notes')}</p>
                <p className="text-sm text-text-secondary">{profile.notes}</p>
              </div>
            )}
            {(profile?.allergies?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">{t('clients.allergies')}</p>
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
        <StatCard icon={<Calendar className="w-5 h-5" />} label={t('clients.stat.totalVisits')} value={computed.totalVisits.toString()} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t('clients.stat.spent')} value={formatCurrency(computed.totalSpent)} />
        <StatCard icon={<Award className="w-5 h-5" />} label={t('clients.stat.avgCheck')} value={formatCurrency(computed.avgSpend)} />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t('clients.stat.cancellations')}
          value={`${computed.cancelledCount + computed.noShowCount}`}
          sub={computed.totalAll > 0 ? `${Math.round(((computed.cancelledCount + computed.noShowCount) / computed.totalAll) * 100)}% ${t('clients.stat.ofTotal')}` : undefined}
        />
      </div>

      {/* Top services */}
      {topServices.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury">
            <h3 className="font-serif text-lg font-medium text-text-primary">{t('clients.topServices')}</h3>
          </div>
          <div className="divide-y divide-border-luxury">
            {topServices.map((r, i) => (
              <div key={r.serviceId} className="flex items-center gap-4 px-6 py-3.5">
                <span className="text-sm font-medium text-text-tertiary tabular-nums w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.serviceName ?? t('clients.service')}</p>
                  <p className="text-xs text-text-tertiary">{r.count} {t('clients.times')}</p>
                </div>
                <span className="text-sm font-semibold text-champagne tabular-nums">{formatCurrency(r.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Profile */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury flex items-center gap-3">
          <h3 className="font-serif text-lg font-medium text-text-primary">{t('client.fin.title')}</h3>
          {computed.isHighValue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-champagne/10 border border-champagne/30 text-champagne text-xs font-medium">
              <Star className="w-3 h-3" /> {t('client.fin.highValue')}
            </span>
          )}
        </div>
        <div className="p-6 space-y-4">
          {computed.unpaidBalance > 0.01 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/30 border border-red-700/40 text-sm">
              <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-300">{t('client.fin.overdueAlert')}:</span>
              <span className="font-semibold text-red-200 ml-auto">{formatCurrency(computed.unpaidBalance)}</span>
            </div>
          )}
          {computed.prepaidBalance > 0.01 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 border border-amber-700/30 text-sm">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-300">{t('client.fin.prepaidAlert')}:</span>
              <span className="font-semibold text-amber-200 ml-auto">{formatCurrency(computed.prepaidBalance)}</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-charcoal rounded-xl p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('client.fin.totalSpent')}</p>
              <p className="text-xl font-semibold text-champagne tabular-nums">{formatCurrency(computed.totalSpent)}</p>
            </div>
            <div className="bg-charcoal rounded-xl p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('client.fin.prepaid')}</p>
              <p className="text-xl font-semibold text-text-primary tabular-nums">{formatCurrency(computed.prepaidBalance)}</p>
            </div>
            <div className="bg-charcoal rounded-xl p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('client.fin.unpaid')}</p>
              <p className={`text-xl font-semibold tabular-nums ${computed.unpaidBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {computed.unpaidBalance > 0 ? formatCurrency(computed.unpaidBalance) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment history */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">{t('clients.history')}</h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            {t('clients.historyCount').replace('{n}', String(appointments.length)).replace('{m}', String(computed.totalAll))}
          </p>
        </div>

        {appointments.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-tertiary">{t('clients.noHistory')}</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.date')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.service')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.specialist')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.status')}</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-3.5 text-text-secondary tabular-nums whitespace-nowrap">
                        {new Date(a.startAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 text-text-primary max-w-[180px] truncate">
                        {a.serviceName ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                        {a.specialistFirstName} {a.specialistLastName}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={getAppointmentStatusBadgeVariant(a.status)} dot>
                          {getAppointmentStatusLabel(a.status, t)}
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
              {appointments.map((a) => (
                <div key={a.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{a.serviceName ?? '—'}</p>
                    <Badge variant={getAppointmentStatusBadgeVariant(a.status)} dot>
                      {getAppointmentStatusLabel(a.status, t)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">
                      {new Date(a.startAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary">{a.specialistFirstName} {a.specialistLastName}</span>
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
