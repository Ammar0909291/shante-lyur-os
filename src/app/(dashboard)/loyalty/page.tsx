import * as React from 'react';
import {
  Users,
  CreditCard,
  Package,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const TIER_CONFIG = {
  BRONZE:   { label: 'Бронза',  color: 'bg-amber-700/20 text-amber-500',   minSpent: 0,       minVisits: 0  },
  SILVER:   { label: 'Серебро', color: 'bg-slate-400/20 text-slate-300',   minSpent: 50_000,  minVisits: 10 },
  GOLD:     { label: 'Золото',  color: 'bg-yellow-400/20 text-yellow-300', minSpent: 100_000, minVisits: 25 },
  PLATINUM: { label: 'Платина', color: 'bg-cyan-400/20 text-cyan-300',     minSpent: 200_000, minVisits: 50 },
};

const mockTiers = {
  BRONZE: 412,
  SILVER: 245,
  GOLD: 142,
  PLATINUM: 48,
};

const mockMemberships = [
  { id: '1', client: 'Анна Соколова',    plan: 'Ежемесячный уход',       renewsAt: '2026-06-01', status: 'ACTIVE',    sessionsUsed: 3, includedSessions: 4 },
  { id: '2', client: 'Елена Морозова',   plan: 'Антивозрастной пакет',   renewsAt: '2026-05-28', status: 'ACTIVE',    sessionsUsed: 1, includedSessions: 2 },
  { id: '3', client: 'Светлана Ким',     plan: 'Годовая карта массажа',  renewsAt: '2026-05-22', status: 'ACTIVE',    sessionsUsed: 8, includedSessions: null },
  { id: '4', client: 'Ирина Волкова',    plan: 'Ежемесячный уход',       renewsAt: '2026-05-20', status: 'ACTIVE',    sessionsUsed: 4, includedSessions: 4 },
  { id: '5', client: 'Татьяна Лебедева', plan: 'VIP Platinum',           renewsAt: '2026-07-15', status: 'ACTIVE',    sessionsUsed: 2, includedSessions: 6 },
];

const mockPackages = [
  { id: '1', client: 'Наталья Попова',   name: '10 сеансов массажа',        remaining: 7,  total: 10, expiresAt: '2026-11-01' },
  { id: '2', client: 'Ольга Новикова',   name: '5 лазерных процедур',       remaining: 3,  total: 5,  expiresAt: '2026-08-15' },
  { id: '3', client: 'Марина Зайцева',   name: '6 косметологических сеансов', remaining: 1, total: 6, expiresAt: '2026-06-01' },
  { id: '4', client: 'Виктория Орлова',  name: '10 сеансов массажа',        remaining: 9,  total: 10, expiresAt: '2026-12-31' },
];

function TierBadge({ tier }: { tier: keyof typeof TIER_CONFIG }) {
  const config = TIER_CONFIG[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {tier === 'PLATINUM' && <Crown className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

export default function LoyaltyPage() {
  const totalMembers = Object.values(mockTiers).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      <div>
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
          Лояльность и членство
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          Программа лояльности, абонементы и удержание клиентов
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Участников программы"
          value={totalMembers}
          subtitle="Всего клиентов с баллами"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Активных членств"
          value={mockMemberships.length}
          subtitle="Платные подписки"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <StatCard
          title="Активных пакетов"
          value={mockPackages.length}
          subtitle="Предоплаченные сеансы"
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="Platinum клиентов"
          value={mockTiers.PLATINUM}
          subtitle="Высший уровень"
          icon={<Crown className="w-5 h-5" />}
        />
      </div>

      {/* Tier distribution */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <h3 className="font-serif text-lg font-medium text-text-primary mb-4">
          Распределение по уровням
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG, typeof TIER_CONFIG[keyof typeof TIER_CONFIG]][]).map(([tier]) => {
            const count = mockTiers[tier];
            const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
            return (
              <div key={tier} className="rounded-xl bg-charcoal p-4 flex flex-col gap-2">
                <TierBadge tier={tier} />
                <p className="text-2xl font-semibold text-text-primary tabular-nums">{count}</p>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-champagne"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-text-tertiary">{pct}% от базы</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active memberships */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            Активные членства
          </h3>
          <span className="text-xs text-text-tertiary">
            {mockMemberships.filter(m => {
              const d = new Date(m.renewsAt);
              return (d.getTime() - Date.now()) < 14 * 86_400_000;
            }).length} продлений в ближайшие 14 дней
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Тариф</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Использовано</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Продление</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {mockMemberships.map((m) => {
                const renewDate = new Date(m.renewsAt);
                const daysLeft = Math.ceil((renewDate.getTime() - Date.now()) / 86_400_000);
                const isExpiringSoon = daysLeft <= 14;
                return (
                  <tr key={m.id} className="hover:bg-charcoal/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{m.client}</td>
                    <td className="px-4 py-4 text-text-secondary">{m.plan}</td>
                    <td className="px-4 py-4 text-text-secondary tabular-nums">
                      {m.sessionsUsed}{m.includedSessions ? `/${m.includedSessions}` : ''}
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      <span className={isExpiringSoon ? 'text-amber-400' : 'text-text-secondary'}>
                        {isExpiringSoon && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {renewDate.toLocaleDateString('ru-RU')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="success" dot>Активно</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prepaid packages */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            Предоплаченные пакеты
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Пакет</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Остаток</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Действует до</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Прогресс</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {mockPackages.map((pkg) => {
                const usedPct = Math.round(((pkg.total - pkg.remaining) / pkg.total) * 100);
                const isLow = pkg.remaining === 1;
                return (
                  <tr key={pkg.id} className="hover:bg-charcoal/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{pkg.client}</td>
                    <td className="px-4 py-4 text-text-secondary">{pkg.name}</td>
                    <td className="px-4 py-4 tabular-nums">
                      <span className={isLow ? 'text-amber-400 font-medium' : 'text-text-primary'}>
                        {isLow && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {pkg.remaining}/{pkg.total}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-text-secondary tabular-nums">
                      {new Date(pkg.expiresAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-champagne"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary tabular-nums">{usedPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier upgrade requirements */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <h3 className="font-serif text-lg font-medium text-text-primary mb-4">
          Условия перехода между уровнями
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left py-2 pr-6 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Уровень</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Потрачено (от)</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Визитов (от)</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Множитель баллов</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {[
                { tier: 'BRONZE'   as const, minSpent: 0,       minVisits: 0,  multiplier: '×1.0' },
                { tier: 'SILVER'   as const, minSpent: 50_000,  minVisits: 10, multiplier: '×1.25' },
                { tier: 'GOLD'     as const, minSpent: 100_000, minVisits: 25, multiplier: '×1.5' },
                { tier: 'PLATINUM' as const, minSpent: 200_000, minVisits: 50, multiplier: '×2.0' },
              ].map(row => (
                <tr key={row.tier}>
                  <td className="py-3 pr-6"><TierBadge tier={row.tier} /></td>
                  <td className="py-3 px-4 text-text-secondary tabular-nums">
                    {row.minSpent > 0 ? `от ${formatCurrency(row.minSpent * 100)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-text-secondary tabular-nums">
                    {row.minVisits > 0 ? `от ${row.minVisits}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-champagne font-medium">{row.multiplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-tertiary mt-3">
          Начисление: 1 балл за каждые 100 ₽. Списание: 100 баллов = 100 ₽ скидки.
        </p>
      </div>
    </div>
  );
}
