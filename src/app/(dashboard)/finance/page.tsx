'use client';

import * as React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  ChevronDown,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { useLocale } from '@/components/providers/locale-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE';
type TransactionType = 'INCOME' | 'EXPENSE';
type TransactionStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'REFUNDED';

interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  method: PaymentMethod;
  category: string;
  description: string;
  specialist?: string;
  client?: string;
  date: string;
}

interface PayoutRecord {
  id: string;
  specialist: string;
  period: string;
  bookings: number;
  gross: number;
  commission: number;
  net: number;
  status: 'PAID' | 'PENDING';
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'INCOME', status: 'COMPLETED', amount: 45000000, method: 'CARD', category: 'Услуги', description: 'Окрашивание — Елена Смирнова', specialist: 'Е. Смирнова', client: 'Анна К.', date: '2026-05-23T10:30:00' },
  { id: 't2', type: 'INCOME', status: 'COMPLETED', amount: 22000000, method: 'CASH', category: 'Услуги', description: 'Маникюр гель-лак — Мария Попова', specialist: 'М. Попова', client: 'Светлана Р.', date: '2026-05-23T11:00:00' },
  { id: 't3', type: 'INCOME', status: 'COMPLETED', amount: 38000000, method: 'ONLINE', category: 'Услуги', description: 'Уход за лицом — Ирина Соколова', specialist: 'И. Соколова', client: 'Мария Д.', date: '2026-05-23T12:15:00' },
  { id: 't4', type: 'EXPENSE', status: 'COMPLETED', amount: 18000000, method: 'CARD', category: 'Расходники', description: 'Краски для волос L\'Oréal', date: '2026-05-23T09:00:00' },
  { id: 't5', type: 'INCOME', status: 'PENDING', amount: 28000000, method: 'CARD', category: 'Услуги', description: 'Шугаринг — Ольга Лебедева', specialist: 'О. Лебедева', client: 'Елена В.', date: '2026-05-23T14:00:00' },
  { id: 't6', type: 'INCOME', status: 'COMPLETED', amount: 15000000, method: 'CASH', category: 'Услуги', description: 'Коррекция бровей — Алина Петрова', specialist: 'А. Петрова', client: 'Дарья Л.', date: '2026-05-22T16:30:00' },
  { id: 't7', type: 'EXPENSE', status: 'COMPLETED', amount: 5500000, method: 'CARD', category: 'Аренда', description: 'Аренда оборудования', date: '2026-05-22T10:00:00' },
  { id: 't8', type: 'INCOME', status: 'REFUNDED', amount: 20000000, method: 'CARD', category: 'Услуги', description: 'Кератиновое выравнивание (возврат)', client: 'Ольга П.', date: '2026-05-22T13:00:00' },
  { id: 't9', type: 'INCOME', status: 'COMPLETED', amount: 58000000, method: 'CARD', category: 'Услуги', description: 'Мелирование — Елена Смирнова', specialist: 'Е. Смирнова', client: 'Татьяна С.', date: '2026-05-21T11:00:00' },
  { id: 't10', type: 'EXPENSE', status: 'COMPLETED', amount: 12000000, method: 'CASH', category: 'Хозтовары', description: 'Полотенца и расходники', date: '2026-05-21T09:00:00' },
  { id: 't11', type: 'INCOME', status: 'COMPLETED', amount: 32000000, method: 'ONLINE', category: 'Услуги', description: 'Педикюр аппаратный — Мария Попова', specialist: 'М. Попова', client: 'Наталья Г.', date: '2026-05-21T14:30:00' },
  { id: 't12', type: 'INCOME', status: 'COMPLETED', amount: 42000000, method: 'CARD', category: 'Услуги', description: 'Антивозрастной уход — Ирина Соколова', specialist: 'И. Соколова', client: 'Людмила Б.', date: '2026-05-20T10:00:00' },
];

const MOCK_PAYOUTS: PayoutRecord[] = [
  { id: 'p1', specialist: 'Елена Смирнова', period: 'Май 2026', bookings: 52, gross: 154000000, commission: 0.35, net: 53900000, status: 'PENDING' },
  { id: 'p2', specialist: 'Мария Попова', period: 'Май 2026', bookings: 46, gross: 126000000, commission: 0.30, net: 37800000, status: 'PENDING' },
  { id: 'p3', specialist: 'Ольга Лебедева', period: 'Май 2026', bookings: 38, gross: 108000000, commission: 0.30, net: 32400000, status: 'PENDING' },
  { id: 'p4', specialist: 'Ирина Соколова', period: 'Апрель 2026', bookings: 44, gross: 118500000, commission: 0.32, net: 37920000, status: 'PAID' },
  { id: 'p5', specialist: 'Алина Петрова', period: 'Апрель 2026', bookings: 31, gross: 95000000, commission: 0.30, net: 28500000, status: 'PAID' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  CARD: <CreditCard className="w-3.5 h-3.5" />,
  ONLINE: <Smartphone className="w-3.5 h-3.5" />,
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  ONLINE: 'Онлайн',
};

function getStatusInfo(status: TransactionStatus): { label: string; variant: 'success' | 'warning' | 'default' | 'error' } {
  const m: Record<TransactionStatus, { label: string; variant: 'success' | 'warning' | 'default' | 'error' }> = {
    COMPLETED: { label: 'Завершено', variant: 'success' },
    PENDING: { label: 'Ожидает', variant: 'warning' },
    CANCELLED: { label: 'Отменено', variant: 'error' },
    REFUNDED: { label: 'Возврат', variant: 'default' },
  };
  return m[status];
}

type TabType = 'transactions' | 'payouts';
type PeriodFilter = 'today' | 'week' | 'month';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { t } = useLocale();
  const [tab, setTab] = React.useState<TabType>('transactions');
  const [period, setPeriod] = React.useState<PeriodFilter>('today');
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<TransactionType | 'ALL'>('ALL');
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [payouts, setPayouts] = React.useState<PayoutRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/payments');
        if (res.ok) {
          const data = await res.json();
          const raw = Array.isArray(data) ? data : data.payments ?? [];
          if (raw.length > 0) {
            setTransactions(raw);
          } else {
            setTransactions(MOCK_TRANSACTIONS);
          }
        } else {
          setTransactions(MOCK_TRANSACTIONS);
        }
      } catch {
        setTransactions(MOCK_TRANSACTIONS);
      } finally {
        setPayouts(MOCK_PAYOUTS);
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = new Date('2026-05-23T00:00:00');

  const filtered = React.useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !tx.description.toLowerCase().includes(q) &&
          !tx.category.toLowerCase().includes(q) &&
          !(tx.specialist?.toLowerCase().includes(q)) &&
          !(tx.client?.toLowerCase().includes(q))
        ) return false;
      }
      const txDate = new Date(tx.date);
      if (period === 'today') {
        return txDate.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return txDate >= weekAgo;
      }
      return true;
    });
  }, [transactions, typeFilter, search, period]);

  const stats = React.useMemo(() => {
    const todayTx = transactions.filter(tx => new Date(tx.date).toDateString() === now.toDateString());
    const income = todayTx.filter(tx => tx.type === 'INCOME' && tx.status === 'COMPLETED').reduce((s, tx) => s + tx.amount, 0);
    const expense = todayTx.filter(tx => tx.type === 'EXPENSE' && tx.status === 'COMPLETED').reduce((s, tx) => s + tx.amount, 0);
    const pending = todayTx.filter(tx => tx.status === 'PENDING').reduce((s, tx) => s + tx.amount, 0);
    const monthIncome = transactions.filter(tx => tx.type === 'INCOME' && tx.status === 'COMPLETED').reduce((s, tx) => s + tx.amount, 0);
    return { income, expense, pending, monthIncome, net: income - expense };
  }, [transactions]);

  function handlePayPayout(id: string) {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'PAID' } : p));
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">Финансы</h1>
          <p className="text-sm text-text-secondary mt-0.5">Транзакции, выручка и выплаты специалистам</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Выручка сегодня"
          value={loading ? '—' : formatCurrency(stats.income)}
          trend={{ value: 12, positive: true, label: 'за неделю' }}
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Расходы сегодня"
          value={loading ? '—' : formatCurrency(stats.expense)}
          icon={<TrendingDown className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Чистая прибыль"
          value={loading ? '—' : formatCurrency(stats.net)}
          icon={<Wallet className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Ожидает оплаты"
          value={loading ? '—' : formatCurrency(stats.pending)}
          icon={<Clock className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-charcoal border border-border-luxury rounded-xl w-fit">
        {(['transactions', 'payouts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              tab === t
                ? 'bg-champagne/15 text-champagne'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {t === 'transactions' ? 'Транзакции' : 'Выплаты специалистам'}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <>
          {/* Filters */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск транзакций..."
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
            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap',
                    period === p
                      ? 'bg-champagne/15 text-champagne border-champagne/30'
                      : 'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary',
                  )}
                >
                  {p === 'today' ? 'Сегодня' : p === 'week' ? '7 дней' : 'Месяц'}
                </button>
              ))}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'ALL')}
                  className={cn(
                    'appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm',
                    'bg-charcoal border border-border-luxury',
                    'text-text-primary focus:outline-none focus:border-champagne/50 transition-all cursor-pointer',
                  )}
                >
                  <option value="ALL">Все типы</option>
                  <option value="INCOME">Доходы</option>
                  <option value="EXPENSE">Расходы</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 border-b border-border-luxury bg-charcoal/20">
              <span className="col-span-4 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Описание</span>
              <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Категория</span>
              <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Метод</span>
              <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-right">Сумма</span>
              <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Статус</span>
            </div>
            {loading ? (
              <div className="divide-y divide-border-luxury">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-charcoal animate-shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-charcoal rounded animate-shimmer" />
                      <div className="h-3 w-24 bg-charcoal rounded animate-shimmer" />
                    </div>
                    <div className="h-5 w-20 bg-charcoal rounded animate-shimmer" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Wallet className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-tertiary text-sm">Транзакции не найдены</p>
              </div>
            ) : (
              <div className="divide-y divide-border-luxury">
                {filtered.map((tx) => {
                  const statusInfo = getStatusInfo(tx.status);
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <div
                      key={tx.id}
                      className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 hover:bg-charcoal/30 transition-colors"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          isIncome ? 'bg-sage/15 text-sage' : 'bg-rose-500/15 text-rose-400',
                        )}>
                          {isIncome
                            ? <ArrowUpRight className="w-4 h-4" />
                            : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {new Date(tx.date).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                            {tx.client && ` · ${tx.client}`}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs px-2 py-1 rounded-lg bg-charcoal text-text-secondary border border-border-luxury">
                          {tx.category}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-sm text-text-secondary">
                        {METHOD_ICONS[tx.method]}
                        {METHOD_LABELS[tx.method]}
                      </div>
                      <div className="col-span-2 sm:text-right">
                        <span className={cn(
                          'text-sm font-semibold',
                          isIncome ? 'text-sage' : 'text-rose-400',
                          tx.status === 'REFUNDED' && 'text-text-tertiary line-through',
                        )}>
                          {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <Badge variant={statusInfo.variant} dot>{statusInfo.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'payouts' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 border-b border-border-luxury bg-charcoal/20">
            <span className="col-span-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Специалист</span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Период</span>
            <span className="col-span-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-center">Записи</span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-right">Выручка</span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-right">К выплате</span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Статус</span>
          </div>
          <div className="divide-y divide-border-luxury">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 hover:bg-charcoal/30 transition-colors"
              >
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar name={payout.specialist} size="sm" />
                  <span className="text-sm font-medium text-text-primary">{payout.specialist}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-text-secondary">{payout.period}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-sm text-text-primary font-medium">{payout.bookings}</span>
                </div>
                <div className="col-span-2 sm:text-right">
                  <span className="text-sm text-text-secondary">{formatCurrency(payout.gross)}</span>
                  <p className="text-xs text-text-tertiary mt-0.5">{Math.round(payout.commission * 100)}% комиссия</p>
                </div>
                <div className="col-span-2 sm:text-right">
                  <span className="text-sm font-semibold text-champagne">{formatCurrency(payout.net)}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {payout.status === 'PAID' ? (
                    <Badge variant="success" dot>Выплачено</Badge>
                  ) : (
                    <button
                      onClick={() => handlePayPayout(payout.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        'bg-champagne/15 text-champagne hover:bg-champagne/25 border border-champagne/20',
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Выплатить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
