'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  AlertTriangle,
  Users,
  Crown,
  Activity,
  UserPlus,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { formatDateShort, formatCurrency, pluralize, cn } from '@/lib/utils';

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

const LOYALTY_LABELS: Record<LoyaltyTier, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
  PLATINUM: 'Платина',
};

const LOYALTY_VARIANT: Record<LoyaltyTier, 'bronze' | 'silver' | 'gold' | 'platinum'> = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
};

const SERVICE_LABELS: Record<string, string> = {
  cosmetology: 'Косметология',
  massage: 'Массаж',
  injection: 'Инъекции',
  laser: 'Лазер',
  mixed: 'Комплексный',
};

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  loyaltyTier: LoyaltyTier;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: Date | null;
  preferredSpecialist: string | null;
  hasAllergies: boolean;
  hasActiveRestrictions: boolean;
  churnRiskScore: number;
  primaryService: keyof typeof SERVICE_LABELS;
  skinType?: string;
}

const MOCK_CLIENTS: ClientRow[] = [
  {
    id: '1', firstName: 'Ирина', lastName: 'Волкова',
    phone: '+7 (916) 234-56-78', loyaltyTier: 'PLATINUM',
    totalVisits: 64, totalSpent: 38400000,
    lastVisitAt: new Date('2025-05-14'), preferredSpecialist: 'Мария П.',
    hasAllergies: false, hasActiveRestrictions: false, churnRiskScore: 0.04,
    primaryService: 'cosmetology', skinType: 'комбинированная',
  },
  {
    id: '2', firstName: 'Анна', lastName: 'Соколова',
    phone: '+7 (903) 456-78-90', loyaltyTier: 'GOLD',
    totalVisits: 28, totalSpent: 15200000,
    lastVisitAt: new Date('2025-05-10'), preferredSpecialist: 'Мария П.',
    hasAllergies: true, hasActiveRestrictions: false, churnRiskScore: 0.11,
    primaryService: 'cosmetology', skinType: 'жирная',
  },
  {
    id: '3', firstName: 'Наталья', lastName: 'Волчкова',
    phone: '+7 (921) 567-89-01', loyaltyTier: 'GOLD',
    totalVisits: 31, totalSpent: 13800000,
    lastVisitAt: new Date('2025-05-08'), preferredSpecialist: 'Наталья В.',
    hasAllergies: true, hasActiveRestrictions: true, churnRiskScore: 0.08,
    primaryService: 'massage',
  },
  {
    id: '4', firstName: 'Елена', lastName: 'Морозова',
    phone: '+7 (495) 678-90-12', loyaltyTier: 'SILVER',
    totalVisits: 15, totalSpent: 7600000,
    lastVisitAt: new Date('2025-04-28'), preferredSpecialist: 'Дарья С.',
    hasAllergies: true, hasActiveRestrictions: false, churnRiskScore: 0.24,
    primaryService: 'injection', skinType: 'чувствительная',
  },
  {
    id: '5', firstName: 'Светлана', lastName: 'Ким',
    phone: '+7 (926) 789-01-23', loyaltyTier: 'SILVER',
    totalVisits: 11, totalSpent: 5400000,
    lastVisitAt: new Date('2025-05-03'), preferredSpecialist: 'Наталья В.',
    hasAllergies: false, hasActiveRestrictions: false, churnRiskScore: 0.19,
    primaryService: 'massage',
  },
  {
    id: '6', firstName: 'Татьяна', lastName: 'Лебедева',
    phone: '+7 (906) 890-12-34', loyaltyTier: 'SILVER',
    totalVisits: 12, totalSpent: 6200000,
    lastVisitAt: new Date('2025-04-15'), preferredSpecialist: null,
    hasAllergies: false, hasActiveRestrictions: true, churnRiskScore: 0.38,
    primaryService: 'cosmetology', skinType: 'нормальная',
  },
  {
    id: '7', firstName: 'Марина', lastName: 'Зайцева',
    phone: '+7 (916) 901-23-45', loyaltyTier: 'SILVER',
    totalVisits: 9, totalSpent: 4100000,
    lastVisitAt: new Date('2025-05-07'), preferredSpecialist: 'Мария П.',
    hasAllergies: false, hasActiveRestrictions: false, churnRiskScore: 0.15,
    primaryService: 'mixed', skinType: 'сухая',
  },
  {
    id: '8', firstName: 'Ольга', lastName: 'Новикова',
    phone: '+7 (929) 012-34-56', loyaltyTier: 'BRONZE',
    totalVisits: 4, totalSpent: 1800000,
    lastVisitAt: new Date('2025-04-22'), preferredSpecialist: 'Ольга К.',
    hasAllergies: true, hasActiveRestrictions: false, churnRiskScore: 0.52,
    primaryService: 'cosmetology', skinType: 'жирная',
  },
  {
    id: '9', firstName: 'Наталья', lastName: 'Попова',
    phone: '+7 (916) 123-45-67', loyaltyTier: 'BRONZE',
    totalVisits: 3, totalSpent: 1200000,
    lastVisitAt: new Date('2025-05-01'), preferredSpecialist: 'Дарья С.',
    hasAllergies: false, hasActiveRestrictions: false, churnRiskScore: 0.41,
    primaryService: 'injection', skinType: 'чувствительная',
  },
  {
    id: '10', firstName: 'Виктория', lastName: 'Сергеева',
    phone: '+7 (937) 234-56-78', loyaltyTier: 'BRONZE',
    totalVisits: 2, totalSpent: 900000,
    lastVisitAt: new Date('2025-03-18'), preferredSpecialist: null,
    hasAllergies: false, hasActiveRestrictions: false, churnRiskScore: 0.68,
    primaryService: 'massage',
  },
];

const TIER_FILTERS = ['ALL', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const;
type TierFilter = typeof TIER_FILTERS[number];

export default function ClientsPage() {
  const [search, setSearch] = React.useState('');
  const [tierFilter, setTierFilter] = React.useState<TierFilter>('ALL');

  const filtered = MOCK_CLIENTS.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchTier = tierFilter === 'ALL' || c.loyaltyTier === tierFilter;
    return matchSearch && matchTier;
  });

  const stats = {
    total: MOCK_CLIENTS.length,
    vip: MOCK_CLIENTS.filter((c) => c.loyaltyTier === 'GOLD' || c.loyaltyTier === 'PLATINUM').length,
    withAlerts: MOCK_CLIENTS.filter((c) => c.hasAllergies || c.hasActiveRestrictions).length,
    churnRisk: MOCK_CLIENTS.filter((c) => c.churnRiskScore >= 0.4).length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            База клиентов
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            {pluralize(MOCK_CLIENTS.length, 'клиент', 'клиента', 'клиентов')} в системе
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Новый клиент
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Всего клиентов"
          value={stats.total}
          subtitle="в базе CRM"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="VIP клиенты"
          value={stats.vip}
          subtitle="Золото и Платина"
          icon={<Crown className="w-5 h-5" />}
        />
        <StatCard
          title="С предупреждениями"
          value={stats.withAlerts}
          subtitle="аллергии / противопоказания"
          icon={<ShieldAlert className="w-5 h-5" />}
        />
        <StatCard
          title="Риск оттока"
          value={stats.churnRisk}
          subtitle="требуют внимания"
          icon={<Activity className="w-5 h-5" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Поиск по имени или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIER_FILTERS.map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all',
                tierFilter === tier
                  ? 'bg-champagne/15 text-champagne border border-champagne/30'
                  : 'bg-charcoal text-text-secondary border border-border-luxury hover:border-border-light hover:text-text-primary',
              )}
            >
              {tier === 'ALL' ? 'Все' : LOYALTY_LABELS[tier as LoyaltyTier]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Профиль
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Специалист
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Последний визит
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Статус
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Визиты
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Оборот
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-charcoal/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${client.firstName} ${client.lastName}`} size="sm" />
                      <div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-text-primary hover:text-champagne transition-colors whitespace-nowrap flex items-center gap-1.5"
                        >
                          {client.firstName} {client.lastName}
                          {(client.hasAllergies || client.hasActiveRestrictions) && (
                            <AlertTriangle
                              className="w-3.5 h-3.5 text-amber-400 shrink-0"
                              title={client.hasActiveRestrictions ? 'Есть противопоказания' : 'Есть аллергии'}
                            />
                          )}
                        </Link>
                        <p className="text-xs text-text-tertiary mt-0.5">{client.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-text-secondary text-xs">{SERVICE_LABELS[client.primaryService]}</p>
                    {client.skinType && (
                      <p className="text-text-tertiary text-xs mt-0.5">кожа: {client.skinType}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-text-secondary text-xs whitespace-nowrap">
                    {client.preferredSpecialist ?? (
                      <span className="text-text-tertiary italic">не выбран</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-text-secondary text-xs tabular-nums whitespace-nowrap">
                    {client.lastVisitAt ? formatDateShort(client.lastVisitAt) : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={LOYALTY_VARIANT[client.loyaltyTier]}>
                        {LOYALTY_LABELS[client.loyaltyTier]}
                      </Badge>
                      {client.churnRiskScore >= 0.4 && (
                        <span className="text-[10px] text-amber-400 font-medium leading-none">
                          риск оттока
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-text-secondary tabular-nums text-sm">
                    {client.totalVisits}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap text-sm">
                    {formatCurrency(client.totalSpent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden divide-y divide-border-luxury">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-start gap-3 px-4 py-4 hover:bg-charcoal/50 transition-colors"
            >
              <Avatar name={`${client.firstName} ${client.lastName}`} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary text-sm">
                    {client.firstName} {client.lastName}
                    {(client.hasAllergies || client.hasActiveRestrictions) && (
                      <AlertTriangle className="inline w-3 h-3 text-amber-400 ml-1.5" />
                    )}
                  </span>
                  <Badge variant={LOYALTY_VARIANT[client.loyaltyTier]}>
                    {LOYALTY_LABELS[client.loyaltyTier]}
                  </Badge>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">{client.phone}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-text-tertiary">{SERVICE_LABELS[client.primaryService]}</span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">
                    {pluralize(client.totalVisits, 'визит', 'визита', 'визитов')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-text-tertiary ml-auto shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary text-sm">Клиенты не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
