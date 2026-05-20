import * as React from 'react';
import Link from 'next/link';
import { Users, Star } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/infrastructure/config/prisma-client';
import { formatCurrency, formatClientRef } from '@/lib/utils';
import { AddClientButton } from './_components/AddClientButton';
import { ClientSearchBox } from './_components/ClientSearchBox';

const LOYALTY_LABEL: Record<string, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
  PLATINUM: 'Платина',
  VIP: 'VIP',
};
const LOYALTY_VARIANT: Record<string, 'default' | 'gold' | 'success' | 'info'> = {
  BRONZE: 'default',
  SILVER: 'default',
  GOLD: 'gold',
  PLATINUM: 'gold',
  VIP: 'success',
};

async function getClients(page: number, search: string) {
  const limit = 50;
  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
        role: 'CLIENT' as const,
      }
    : { role: 'CLIENT' as const };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        customerProfile: {
          select: { loyaltyTier: true, totalVisits: true, totalSpent: true, lastVisitAt: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, limit };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? '1'));
  const search = sp.search ?? '';
  const { users, total, limit } = await getClients(page, search);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Клиенты</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {total.toLocaleString('ru-RU')} клиентов в базе
          </p>
        </div>
        <AddClientButton />
      </div>

      {/* Live search */}
      <div className="mb-6">
        <ClientSearchBox defaultValue={search} />
      </div>

      {users.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <Users className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">
            {search ? 'Клиентов по запросу не найдено' : 'Клиентов пока нет'}
          </p>
        </div>
      ) : (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Лояльность</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Визиты</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Потрачено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-charcoal/50 transition-colors group">
                    <td className="px-6 py-3.5">
                      <Link href={`/clients/${u.id}`} className="flex items-center gap-3">
                        <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                        <div>
                          <span className="font-medium text-text-primary group-hover:text-champagne transition-colors">
                            {u.firstName} {u.lastName}
                          </span>
                          <p className="text-[10px] font-mono text-text-tertiary">{formatClientRef(u.id)}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">{u.email}</td>
                    <td className="px-4 py-3.5">
                      {u.customerProfile?.loyaltyTier ? (
                        <Badge variant={LOYALTY_VARIANT[u.customerProfile.loyaltyTier] ?? 'default'}>
                          <Star className="w-3 h-3 mr-1" />
                          {LOYALTY_LABEL[u.customerProfile.loyaltyTier] ?? u.customerProfile.loyaltyTier}
                        </Badge>
                      ) : (
                        <span className="text-text-tertiary text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-text-secondary tabular-nums">
                      {u.customerProfile?.totalVisits ?? 0}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-text-primary tabular-nums">
                      {u.customerProfile
                        ? formatCurrency(Number(u.customerProfile.totalSpent))
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-border-luxury">
            {users.map((u) => (
              <Link key={u.id} href={`/clients/${u.id}`} className="px-4 py-4 flex items-start gap-3 hover:bg-charcoal/50 transition-colors">
                <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary text-sm">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.customerProfile?.loyaltyTier && (
                      <Badge variant={LOYALTY_VARIANT[u.customerProfile.loyaltyTier] ?? 'default'}>
                        {LOYALTY_LABEL[u.customerProfile.loyaltyTier] ?? u.customerProfile.loyaltyTier}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{u.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">
                      {u.customerProfile?.totalVisits ?? 0} визитов
                    </span>
                    {u.customerProfile && (
                      <>
                        <span className="text-xs text-text-tertiary">·</span>
                        <span className="text-xs text-champagne">
                          {formatCurrency(Number(u.customerProfile.totalSpent))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-text-tertiary">
            Страница {page} из {totalPages} · {total} клиентов
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                ← Назад
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                Вперёд →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
