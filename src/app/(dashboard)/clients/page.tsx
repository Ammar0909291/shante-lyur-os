'use client';

import * as React from 'react';
import { Plus, Search, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: Date | null;
  totalSpent: number;
  totalVisits: number;
  loyaltyTier: LoyaltyTier;
  notes?: string;
}

const mockClients: Client[] = [
  { id: 'c1', name: 'Анна Соколова', email: 'anna.sokolova@mail.ru', phone: '+7 (999) 123-45-67', lastVisit: new Date('2025-05-17'), totalSpent: 128_00000, totalVisits: 24, loyaltyTier: 'PLATINUM' },
  { id: 'c2', name: 'Елена Морозова', email: 'elena.morozova@gmail.com', phone: '+7 (916) 234-56-78', lastVisit: new Date('2025-05-15'), totalSpent: 87_50000, totalVisits: 18, loyaltyTier: 'GOLD' },
  { id: 'c3', name: 'Светлана Ким', email: 'svetlana.kim@yandex.ru', phone: '+7 (903) 345-67-89', lastVisit: new Date('2025-05-12'), totalSpent: 45_00000, totalVisits: 9, loyaltyTier: 'SILVER' },
  { id: 'c4', name: 'Ирина Волкова', email: 'i.volkova@inbox.ru', phone: '+7 (925) 456-78-90', lastVisit: new Date('2025-05-10'), totalSpent: 22_50000, totalVisits: 5, loyaltyTier: 'BRONZE' },
  { id: 'c5', name: 'Татьяна Лебедева', email: 'tlebed@mail.ru', phone: '+7 (977) 567-89-01', lastVisit: new Date('2025-05-08'), totalSpent: 95_00000, totalVisits: 21, loyaltyTier: 'GOLD' },
  { id: 'c6', name: 'Наталья Попова', email: 'n.popova@gmail.com', phone: '+7 (967) 678-90-12', lastVisit: new Date('2025-05-06'), totalSpent: 156_00000, totalVisits: 31, loyaltyTier: 'PLATINUM' },
  { id: 'c7', name: 'Ольга Новикова', email: 'o.novikova@yandex.ru', phone: '+7 (915) 789-01-23', lastVisit: new Date('2025-04-28'), totalSpent: 38_00000, totalVisits: 7, loyaltyTier: 'SILVER' },
  { id: 'c8', name: 'Марина Зайцева', email: 'marina.z@mail.ru', phone: '+7 (985) 890-12-34', lastVisit: new Date('2025-04-20'), totalSpent: 12_50000, totalVisits: 3, loyaltyTier: 'BRONZE' },
  { id: 'c9', name: 'Юлия Кузнецова', email: 'julia.k@outlook.com', phone: '+7 (926) 901-23-45', lastVisit: new Date('2025-04-15'), totalSpent: 68_00000, totalVisits: 14, loyaltyTier: 'GOLD' },
  { id: 'c10', name: 'Валерия Орлова', email: 'v.orlova@gmail.com', phone: '+7 (962) 012-34-56', lastVisit: new Date('2025-04-10'), totalSpent: 31_00000, totalVisits: 6, loyaltyTier: 'SILVER' },
];

const tierLabels: Record<LoyaltyTier, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
  PLATINUM: 'Платина',
};

const tierVariants: Record<LoyaltyTier, 'bronze' | 'silver' | 'gold' | 'platinum'> = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
};

const tierFilters: Array<{ value: LoyaltyTier | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'PLATINUM', label: 'Платина' },
  { value: 'GOLD', label: 'Золото' },
  { value: 'SILVER', label: 'Серебро' },
  { value: 'BRONZE', label: 'Бронза' },
];

export default function ClientsPage() {
  const [search, setSearch] = React.useState('');
  const [tierFilter, setTierFilter] = React.useState<LoyaltyTier | 'ALL'>('ALL');

  const filtered = React.useMemo(() => {
    return mockClients.filter((c) => {
      const matchesTier = tierFilter === 'ALL' || c.loyaltyTier === tierFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q);
      return matchesTier && matchesSearch;
    });
  }, [search, tierFilter]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
            База клиентов
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'клиент' : 'клиентов'}
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить клиента
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Поиск по имени, email, телефону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tierFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTierFilter(value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
                tierFilter === value
                  ? 'bg-champagne/10 text-champagne border border-champagne/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-charcoal flex items-center justify-center">
              <Users className="w-7 h-7 text-text-tertiary" />
            </div>
            <div className="text-center">
              <p className="font-serif text-lg text-text-primary">Клиенты не найдены</p>
              <p className="text-sm text-text-secondary mt-1">
                Попробуйте изменить параметры поиска
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    {['Клиент', 'Контакты', 'Последний визит', 'Визитов', 'Сумма покупок', 'Программа', ''].map(
                      (col) => (
                        <th
                          key={col}
                          className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary first:pl-6 last:pr-6 last:text-right whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {filtered.map((client) => (
                    <tr key={client.id} className="hover:bg-charcoal/40 transition-colors group">
                      <td className="pl-6 pr-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.name} size="md" />
                          <span className="font-medium text-text-primary whitespace-nowrap">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-text-secondary text-sm">{client.email}</p>
                        <p className="text-text-tertiary text-xs mt-0.5">{client.phone}</p>
                      </td>
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                        {client.lastVisit ? formatDate(client.lastVisit) : '—'}
                      </td>
                      <td className="px-4 py-4 text-text-secondary tabular-nums">
                        {client.totalVisits}
                      </td>
                      <td className="px-4 py-4 font-medium text-text-primary tabular-nums whitespace-nowrap">
                        {formatCurrency(client.totalSpent)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={tierVariants[client.loyaltyTier]}>
                          {tierLabels[client.loyaltyTier]}
                        </Badge>
                      </td>
                      <td className="pr-6 py-4 text-right">
                        <button
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Действия для ${client.name}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border-luxury">
              {filtered.map((client) => (
                <div key={client.id} className="p-4 flex items-center gap-3">
                  <Avatar name={client.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-text-primary text-sm truncate">
                        {client.name}
                      </p>
                      <Badge variant={tierVariants[client.loyaltyTier]}>
                        {tierLabels[client.loyaltyTier]}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{client.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-tertiary">
                        {client.totalVisits} визитов
                      </span>
                      <span className="text-xs font-medium text-champagne ml-auto">
                        {formatCurrency(client.totalSpent)}
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
