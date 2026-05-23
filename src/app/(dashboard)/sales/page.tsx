'use client';

import * as React from 'react';
import {
  Search,
  ShoppingCart,
  TrendingUp,
  Wallet,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { useLocale } from '@/components/providers/locale-provider';

interface Payment {
  id: string;
  amount: number;
  status: string;
  method?: string;
  createdAt: string;
  appointment?: {
    customer?: { user: { name: string } };
    service?: { name: string };
    specialist?: { user: { name: string } };
  };
}

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'p1',
    amount: 350000,
    status: 'PAID',
    method: 'CARD',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Анна Михайлова' } },
      service: { name: 'Окрашивание волос' },
      specialist: { user: { name: 'Елена Смирнова' } },
    },
  },
  {
    id: 'p2',
    amount: 220000,
    status: 'PAID',
    method: 'CASH',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Светлана Козлова' } },
      service: { name: 'Маникюр с гель-лаком' } ,
      specialist: { user: { name: 'Мария Попова' } },
    },
  },
  {
    id: 'p3',
    amount: 280000,
    status: 'PAID',
    method: 'CARD',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Ольга Новикова' } },
      service: { name: 'Уход за лицом' },
      specialist: { user: { name: 'Ирина Соколова' } },
    },
  },
  {
    id: 'p4',
    amount: 180000,
    status: 'REFUNDED',
    method: 'CARD',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Татьяна Волкова' } },
      service: { name: 'Коррекция бровей' },
      specialist: { user: { name: 'Алина Петрова' } },
    },
  },
  {
    id: 'p5',
    amount: 450000,
    status: 'PAID',
    method: 'ONLINE',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Наталья Морозова' } },
      service: { name: 'Комплексный уход' },
      specialist: { user: { name: 'Мария Попова' } },
    },
  },
  {
    id: 'p6',
    amount: 320000,
    status: 'UNPAID',
    method: undefined,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Дарья Лебедева' } },
      service: { name: 'Пилинг' },
      specialist: { user: { name: 'Ирина Соколова' } },
    },
  },
  {
    id: 'p7',
    amount: 150000,
    status: 'PAID',
    method: 'CASH',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    appointment: {
      customer: { user: { name: 'Ирина Захарова' } },
      service: { name: 'Классический маникюр' },
      specialist: { user: { name: 'Мария Попова' } },
    },
  },
];

function getPaymentMethodLabel(method?: string): string {
  if (!method) return '—';
  const map: Record<string, string> = {
    CARD: 'Карта',
    CASH: 'Наличные',
    ONLINE: 'Онлайн',
  };
  return map[method] ?? method;
}

function getPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PAID: 'Оплачено',
    UNPAID: 'Не оплачено',
    REFUNDED: 'Возврат',
  };
  return map[status] ?? status;
}

type SortField = 'createdAt' | 'amount';
type SortDir = 'asc' | 'desc';

export default function SalesPage() {
  const { t } = useLocale();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [sortField, setSortField] = React.useState<SortField>('createdAt');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');

  const load = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        const items: Payment[] = Array.isArray(data) ? data : data.payments ?? [];
        setPayments(items.length > 0 ? items : MOCK_PAYMENTS);
      } else {
        setPayments(MOCK_PAYMENTS);
      }
    } catch {
      setPayments(MOCK_PAYMENTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    return payments
      .filter((p) => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const client = p.appointment?.customer?.user.name?.toLowerCase() ?? '';
          const svc = p.appointment?.service?.name?.toLowerCase() ?? '';
          if (!client.includes(q) && !svc.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'createdAt') {
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          cmp = a.amount - b.amount;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [payments, statusFilter, search, sortField, sortDir]);

  const stats = React.useMemo(() => {
    const paid = payments.filter(p => p.status === 'PAID');
    const totalRevenue = paid.reduce((acc, p) => acc + p.amount, 0);
    const todayRevenue = paid
      .filter(p => {
        const d = new Date(p.createdAt);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      })
      .reduce((acc, p) => acc + p.amount, 0);
    const refunds = payments.filter(p => p.status === 'REFUNDED').reduce((acc, p) => acc + p.amount, 0);
    const unpaid = payments.filter(p => p.status === 'UNPAID').length;
    return { totalRevenue, todayRevenue, refunds, unpaid };
  }, [payments]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
      : <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">
            {t('nav.sales')}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Транзакции и движение денежных средств
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
            'bg-charcoal border border-border-luxury text-text-secondary',
            'hover:text-text-primary hover:border-border-light transition-all',
          )}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Обновить
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Выручка (всего)"
          value={loading ? '—' : formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Сегодня"
          value={loading ? '—' : formatCurrency(stats.todayRevenue)}
          icon={<Wallet className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Возвраты"
          value={loading ? '—' : formatCurrency(stats.refunds)}
          icon={<ShoppingCart className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Не оплачено"
          value={loading ? '—' : stats.unpaid}
          icon={<CreditCard className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по клиенту, услуге..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm',
              'bg-charcoal border border-border-luxury',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-champagne/50 transition-all',
            )}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {([['ALL', 'Все'], ['PAID', 'Оплачено'], ['UNPAID', 'Долг'], ['REFUNDED', 'Возврат']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                statusFilter === key
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                  Клиент
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                  Услуга
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                  Метод
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors select-none"
                  onClick={() => toggleSort('createdAt')}
                >
                  Дата <SortIcon field="createdAt" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                  Статус
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors select-none"
                  onClick={() => toggleSort('amount')}
                >
                  Сумма <SortIcon field="amount" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-luxury">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-charcoal rounded animate-shimmer" style={{ width: `${50 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-text-tertiary text-sm">
                    Транзакции не найдены
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border-luxury hover:bg-charcoal/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={payment.appointment?.customer?.user.name ?? '?'} size="sm" />
                        <span className="text-sm text-text-primary">
                          {payment.appointment?.customer?.user.name ?? 'Неизвестный'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">
                        {payment.appointment?.service?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">
                        {getPaymentMethodLabel(payment.method)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-text-primary">{formatTime(payment.createdAt)}</p>
                      <p className="text-xs text-text-tertiary">{formatDate(payment.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={payment.status === 'PAID' ? 'paid' : payment.status === 'REFUNDED' ? 'refunded' : 'unpaid'}
                        dot
                      >
                        {getPaymentStatusLabel(payment.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'text-sm font-semibold',
                        payment.status === 'PAID' ? 'text-champagne' :
                        payment.status === 'REFUNDED' ? 'text-lavender' :
                        'text-text-tertiary',
                      )}>
                        {payment.status === 'REFUNDED' ? '−' : ''}{formatCurrency(payment.amount)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border-luxury flex items-center justify-between text-xs text-text-tertiary">
            <span>Показано {filtered.length} из {payments.length} транзакций</span>
            <span className="text-champagne font-medium">
              Итого: {formatCurrency(filtered.filter(p => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
