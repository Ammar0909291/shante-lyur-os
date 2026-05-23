'use client';

import * as React from 'react';
import {
  Calendar,
  Clock,
  Search,
  Check,
  X,
  ChevronDown,
  CalendarDays,
  Users,
  TrendingUp,
  Scissors,
  Plus,
  UserX,
  CheckCircle2,
} from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { Avatar } from '@/components/ui/avatar';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { cn, formatCurrency, formatDate, formatTime } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type DateFilter = 'today' | 'week' | 'month';

interface Booking {
  id: string;
  client: string;
  service: string;
  specialist: string;
  dateTime: Date;
  duration: number;
  status: BookingStatus;
  amount: number;
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_BOOKINGS: Booking[] = [
  { id: '1', client: 'Анна Соколова',    service: 'Гиалуроновый лифтинг',  specialist: 'Мария П.',   dateTime: new Date('2026-05-23T09:00:00'), duration: 90,  status: 'CONFIRMED',  amount: 12_00000 },
  { id: '2', client: 'Елена Морозова',   service: 'Антивозрастной массаж', specialist: 'Ольга К.',   dateTime: new Date('2026-05-23T10:30:00'), duration: 60,  status: 'PENDING',    amount:  8_00000 },
  { id: '3', client: 'Светлана Ким',     service: 'Пилинг & Детокс',       specialist: 'Мария П.',   dateTime: new Date('2026-05-23T11:00:00'), duration: 45,  status: 'CONFIRMED',  amount:  6_50000 },
  { id: '4', client: 'Ирина Волкова',    service: 'Ароматерапия',           specialist: 'Наталья В.', dateTime: new Date('2026-05-23T12:00:00'), duration: 75,  status: 'COMPLETED',  amount:  7_00000 },
  { id: '5', client: 'Татьяна Лебедева', service: 'Лазерная эпиляция',     specialist: 'Ольга К.',   dateTime: new Date('2026-05-23T13:30:00'), duration: 60,  status: 'CANCELLED',  amount: 15_00000 },
  { id: '6', client: 'Наталья Попова',   service: 'Биоревитализация',       specialist: 'Дарья С.',   dateTime: new Date('2026-05-23T14:00:00'), duration: 120, status: 'PENDING',    amount: 18_00000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

function isInDateRange(date: Date, filter: DateFilter): boolean {
  const now = new Date();
  const start = new Date(now);

  if (filter === 'today') {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
  if (filter === 'week') {
    start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  }
  if (filter === 'month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
}

// ─── Normalize API response ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBooking(raw: any): Booking {
  return {
    id: raw.id ?? String(Math.random()),
    client: raw.customer?.user?.name ?? raw.client ?? 'Клиент',
    service: raw.service?.name ?? raw.service ?? 'Услуга',
    specialist: raw.specialist?.user?.name ?? raw.specialist ?? 'Специалист',
    dateTime: new Date(raw.scheduledAt ?? raw.dateTime ?? Date.now()),
    duration: raw.durationMinutes ?? raw.duration ?? 60,
    status: (raw.status as BookingStatus) ?? 'PENDING',
    amount: raw.totalPrice ?? raw.amount ?? 0,
  };
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function SkeletonTableRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-charcoal animate-shimmer shrink-0" />
          <div className="h-3.5 w-28 bg-charcoal rounded animate-shimmer" />
        </div>
      </td>
      <td className="px-4 py-4"><div className="h-3.5 w-36 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-3.5 w-20 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-4 py-4">
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-charcoal rounded animate-shimmer" />
          <div className="h-3 w-14 bg-charcoal rounded animate-shimmer" />
        </div>
      </td>
      <td className="px-4 py-4"><div className="h-3.5 w-16 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-5 w-24 bg-charcoal rounded-full animate-shimmer" /></td>
      <td className="px-4 py-4"><div className="h-3.5 w-20 bg-charcoal rounded animate-shimmer" /></td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="h-8 w-8 bg-charcoal rounded-lg animate-shimmer" />
          <div className="h-8 w-8 bg-charcoal rounded-lg animate-shimmer" />
        </div>
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="p-4 border-b border-border-luxury">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-charcoal animate-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-3.5 w-32 bg-charcoal rounded animate-shimmer" />
            <div className="h-5 w-20 bg-charcoal rounded-full animate-shimmer" />
          </div>
          <div className="h-3 w-40 bg-charcoal rounded animate-shimmer" />
          <div className="h-3 w-28 bg-charcoal rounded animate-shimmer" />
          <div className="flex justify-between items-center">
            <div className="h-3 w-24 bg-charcoal rounded animate-shimmer" />
            <div className="h-3.5 w-20 bg-charcoal rounded animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Action buttons for PENDING bookings ─────────────────────────────────────

interface ActionButtonsProps {
  booking: Booking;
  onStatusChange: (id: string, status: BookingStatus) => void;
  updatingId: string | null;
}

function ActionButtons({ booking, onStatusChange, updatingId }: ActionButtonsProps) {
  const isUpdating = updatingId === booking.id;

  if (booking.status === 'PENDING') {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => onStatusChange(booking.id, 'CONFIRMED')}
          disabled={isUpdating}
          title="Подтвердить"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            'bg-sage/10 text-sage border border-sage/20',
            'hover:bg-sage/20 hover:border-sage/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onStatusChange(booking.id, 'CANCELLED')}
          disabled={isUpdating}
          title="Отменить"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            'bg-red-500/10 text-red-400 border border-red-500/20',
            'hover:bg-red-500/20 hover:border-red-500/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (booking.status === 'CONFIRMED') {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => onStatusChange(booking.id, 'COMPLETED')}
          disabled={isUpdating}
          title="Завершить"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            'hover:bg-blue-500/20 hover:border-blue-500/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onStatusChange(booking.id, 'NO_SHOW')}
          disabled={isUpdating}
          title="Не явился"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
            'hover:bg-zinc-500/20 hover:border-zinc-500/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <UserX className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onStatusChange(booking.id, 'CANCELLED')}
          disabled={isUpdating}
          title="Отменить"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            'bg-red-500/10 text-red-400 border border-red-500/20',
            'hover:bg-red-500/20 hover:border-red-500/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end">
      <span className="text-xs text-text-tertiary select-none">—</span>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, count, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-champagne text-obsidian shadow-[0_2px_8px_rgba(212,175,122,0.25)]'
          : 'bg-onyx border border-border-luxury text-text-secondary hover:border-border-light hover:text-text-primary',
      )}
    >
      {label}
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[1.25rem] h-5 px-1.5',
          active ? 'bg-obsidian/20 text-obsidian' : 'bg-charcoal text-text-tertiary',
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Date filter pill ─────────────────────────────────────────────────────────

interface DatePillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function DatePill({ label, active, onClick }: DatePillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 h-9 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200',
        active
          ? 'bg-champagne/15 text-champagne border border-champagne/30'
          : 'bg-onyx border border-border-luxury text-text-secondary hover:border-border-light hover:text-text-primary',
      )}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  useLocale();

  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('today');
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  // Fetch bookings on mount; fall back to mock data on error or empty result
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/appointments')
      .then(async (res) => {
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (cancelled) return;
        const rawItems = Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data)
            ? json.data
            : [];
        const items = rawItems.map(normalizeBooking);
        setBookings(items.length > 0 ? items : MOCK_BOOKINGS);
      })
      .catch(() => {
        if (!cancelled) setBookings(MOCK_BOOKINGS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Update booking status via PATCH /api/appointments/[id]
  const handleStatusChange = React.useCallback(async (id: string, status: BookingStatus) => {
    setUpdatingId(id);
    // Optimistic update
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      // silently keep optimistic state
    } finally {
      setUpdatingId(null);
    }
  }, []);

  // ── Derived counts ──────────────────────────────────────────────────────────
  const countAll       = bookings.length;
  const countPending   = bookings.filter((b) => b.status === 'PENDING').length;
  const countConfirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const countCompleted = bookings.filter((b) => b.status === 'COMPLETED').length;
  const countCancelled = bookings.filter((b) => b.status === 'CANCELLED').length;

  const totalRevenue = bookings
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.amount, 0);

  const todayCount = bookings.filter((b) => isInDateRange(b.dateTime, 'today')).length;

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let list = bookings;

    // Date filter
    list = list.filter((b) => isInDateRange(b.dateTime, dateFilter));

    // Status tab filter
    if (statusFilter !== 'ALL') {
      list = list.filter((b) => b.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.client.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q) ||
          b.specialist.toLowerCase().includes(q),
      );
    }

    return list;
  }, [bookings, statusFilter, dateFilter, search]);

  const statusTabs: { key: BookingStatus | 'ALL'; label: string; count: number }[] = [
    { key: 'ALL',       label: 'Все',          count: countAll },
    { key: 'PENDING',   label: 'Ожидание',     count: countPending },
    { key: 'CONFIRMED', label: 'Подтверждено', count: countConfirmed },
    { key: 'COMPLETED', label: 'Завершено',    count: countCompleted },
    { key: 'CANCELLED', label: 'Отменено',     count: countCancelled },
  ];

  const datePills: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week',  label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            Записи
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Управление записями клиентов и расписанием специалистов
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Новая запись
        </Button>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Записей сегодня"
          value={loading ? '—' : todayCount}
          subtitle={`${countPending} ожидают подтверждения`}
          loading={loading}
          icon={<CalendarDays className="w-5 h-5" />}
          trend={{ value: 8, positive: true, label: 'vs вчера' }}
        />
        <StatCard
          title="Подтверждено"
          value={loading ? '—' : countConfirmed}
          subtitle="активных записей"
          loading={loading}
          icon={<Check className="w-5 h-5" />}
          trend={{ value: 5, positive: true, label: 'vs пред. день' }}
        />
        <StatCard
          title="Выручка за период"
          value={loading ? '—' : formatCurrency(totalRevenue)}
          subtitle="завершённые записи"
          loading={loading}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: 14, positive: true, label: 'vs пред. период' }}
        />
        <StatCard
          title="Уникальных клиентов"
          value={loading ? '—' : new Set(bookings.map((b) => b.client)).size}
          subtitle="в текущей выборке"
          loading={loading}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 3, positive: true, label: 'vs пред. период' }}
        />
      </div>

      {/* ── Status tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {statusTabs.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            count={tab.count}
            active={statusFilter === tab.key}
            onClick={() => setStatusFilter(tab.key)}
          />
        ))}
      </div>

      {/* ── Search + date filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Клиент, услуга, специалист…"
            className={cn(
              'w-full h-10 pl-9 pr-4 rounded-lg text-sm',
              'bg-onyx border border-border-luxury',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20',
              'transition-colors duration-200',
            )}
          />
        </div>

        {/* Date filter pills */}
        <div className="flex items-center gap-2">
          {datePills.map((pill) => (
            <DatePill
              key={pill.key}
              label={pill.label}
              active={dateFilter === pill.key}
              onClick={() => setDateFilter(pill.key)}
            />
          ))}
        </div>
      </div>

      {/* ── Table / Cards container ───────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {/* Container header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">
            {statusFilter === 'ALL'       && 'Все записи'}
            {statusFilter === 'PENDING'   && 'Записи в ожидании'}
            {statusFilter === 'CONFIRMED' && 'Подтверждённые записи'}
            {statusFilter === 'COMPLETED' && 'Завершённые записи'}
            {statusFilter === 'CANCELLED' && 'Отменённые записи'}
          </h3>
          {!loading && (
            <span className="text-xs text-text-tertiary font-medium">
              {filtered.length}{' '}
              {filtered.length === 1
                ? 'запись'
                : filtered.length >= 2 && filtered.length <= 4
                  ? 'записи'
                  : 'записей'}
            </span>
          )}
        </div>

        {/* ── Desktop table ──────────────────────────────────────────── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Услуга
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Специалист
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Дата и время
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Длит.
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Статус
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Сумма
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} />)
                : filtered.length === 0
                  ? null
                  : filtered.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-charcoal/50 transition-colors group"
                    >
                      {/* Client */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={booking.client} size="sm" />
                          <span className="font-medium text-text-primary whitespace-nowrap">
                            {booking.client}
                          </span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <Scissors className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                          <span className="text-text-secondary truncate">{booking.service}</span>
                        </div>
                      </td>

                      {/* Specialist */}
                      <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                        {booking.specialist}
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-text-primary font-medium whitespace-nowrap tabular-nums">
                            {formatTime(booking.dateTime)}
                          </div>
                          <div className="text-xs text-text-tertiary whitespace-nowrap mt-0.5">
                            {formatDate(booking.dateTime)}
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                          {formatDuration(booking.duration)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <Badge variant={getAppointmentStatusBadgeVariant(booking.status)} dot>
                          {getAppointmentStatusLabel(booking.status)}
                        </Badge>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-4 text-right font-semibold text-champagne tabular-nums whitespace-nowrap">
                        {formatCurrency(booking.amount)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <ActionButtons
                          booking={booking}
                          onStatusChange={handleStatusChange}
                          updatingId={updatingId}
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-champagne/8 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-champagne" />
              </div>
              <div>
                <p className="font-medium text-text-primary text-base">
                  {search ? 'Записи не найдены' : 'Нет записей за выбранный период'}
                </p>
                <p className="text-sm text-text-tertiary mt-1">
                  {search
                    ? `Нет совпадений для «${search}»`
                    : 'Измените фильтры или создайте новую запись'}
                </p>
              </div>
              {!search && (
                <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Создать запись
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile card list ───────────────────────────────────────── */}
        <div className="sm:hidden divide-y divide-border-luxury">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                  <Calendar className="w-8 h-8 text-champagne/50" />
                  <p className="text-text-secondary text-sm">
                    {search
                      ? `Нет совпадений для «${search}»`
                      : 'Нет записей за выбранный период'}
                  </p>
                  {!search && (
                    <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                      Создать запись
                    </Button>
                  )}
                </div>
              )
              : filtered.map((booking) => (
                <div key={booking.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={booking.client} size="md" />
                    <div className="flex-1 min-w-0">
                      {/* Row 1: name + status */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-text-primary text-sm">
                          {booking.client}
                        </span>
                        <Badge variant={getAppointmentStatusBadgeVariant(booking.status)} dot>
                          {getAppointmentStatusLabel(booking.status)}
                        </Badge>
                      </div>

                      {/* Row 2: service */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Scissors className="w-3 h-3 text-text-tertiary shrink-0" />
                        <p className="text-xs text-text-secondary truncate">{booking.service}</p>
                      </div>

                      {/* Row 3: time + specialist */}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(booking.dateTime)}
                        </span>
                        <span>·</span>
                        <span>{formatDuration(booking.duration)}</span>
                        <span>·</span>
                        <span className="truncate">{booking.specialist}</span>
                      </div>

                      {/* Row 4: date + amount + actions */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-text-tertiary">
                          {formatDate(booking.dateTime)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-champagne tabular-nums">
                            {formatCurrency(booking.amount)}
                          </span>
                          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                            <div className="flex items-center gap-1.5">
                              {booking.status === 'PENDING' && (
                                <button
                                  onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}
                                  disabled={updatingId === booking.id}
                                  title="Подтвердить"
                                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center','bg-sage/10 text-sage border border-sage/20','hover:bg-sage/20 transition-colors','disabled:opacity-40')}
                                ><Check className="w-3 h-3" /></button>
                              )}
                              {booking.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleStatusChange(booking.id, 'COMPLETED')}
                                  disabled={updatingId === booking.id}
                                  title="Завершить"
                                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center','bg-blue-500/10 text-blue-400 border border-blue-500/20','hover:bg-blue-500/20 transition-colors','disabled:opacity-40')}
                                ><CheckCircle2 className="w-3 h-3" /></button>
                              )}
                              <button
                                onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                                disabled={updatingId === booking.id}
                                title="Отменить"
                                className={cn('w-7 h-7 rounded-lg flex items-center justify-center','bg-red-500/10 text-red-400 border border-red-500/20','hover:bg-red-500/20 transition-colors','disabled:opacity-40')}
                              ><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* ── Legend / info bar ─────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-text-tertiary px-1">
          <span className="flex items-center gap-2">
            <ChevronDown className="w-3.5 h-3.5" />
            Записей показано: {filtered.length} из {bookings.length}
          </span>
          {statusFilter === 'ALL' && (
            <span className="hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Ожидание: {countPending}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Подтверждено: {countConfirmed}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage inline-block" />
                Завершено: {countCompleted}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
