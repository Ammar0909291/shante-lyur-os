'use client';

import * as React from 'react';
import { Calendar, Plus, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatTime, formatDate, formatCurrency, cn } from '@/lib/utils';
import { CreateAppointmentDialog } from '@/components/dialogs/create-appointment-dialog';
import { AppointmentDetailDialog, type AppointmentLike } from '@/components/dialogs/appointment-detail-dialog';
import { apiGet } from '@/lib/api-client';
import { useT } from '@/lib/i18n-context';

interface Booking {
  id: string;
  client: string;
  service: string;
  specialist: string;
  time: Date;
  status: string;
  amount: number;
  category?: string;
}

const mockBookings: Booking[] = [
  { id: '1', client: 'Анна Соколова', service: 'Гиалуроновый лифтинг', specialist: 'Мария Петрова', time: new Date('2025-05-19T09:00:00'), status: 'CONFIRMED', amount: 1200000, category: 'INJECTION' },
  { id: '2', client: 'Елена Морозова', service: 'Антивозрастной массаж лица', specialist: 'Ольга Козлова', time: new Date('2025-05-19T10:30:00'), status: 'CONFIRMED', amount: 800000, category: 'MASSAGE' },
  { id: '3', client: 'Светлана Ким', service: 'Пилинг & Детокс', specialist: 'Мария Петрова', time: new Date('2025-05-19T11:00:00'), status: 'PENDING', amount: 650000, category: 'COSMETOLOGY' },
  { id: '4', client: 'Ирина Волкова', service: 'Ароматерапевтический массаж', specialist: 'Наталья Васильева', time: new Date('2025-05-19T12:00:00'), status: 'COMPLETED', amount: 700000, category: 'MASSAGE' },
  { id: '5', client: 'Татьяна Лебедева', service: 'Лазерная эпиляция', specialist: 'Ольга Козлова', time: new Date('2025-05-19T13:30:00'), status: 'CONFIRMED', amount: 1500000, category: 'LASER' },
  { id: '6', client: 'Наталья Попова', service: 'Биоревитализация', specialist: 'Дарья Смирнова', time: new Date('2025-05-20T10:00:00'), status: 'PENDING', amount: 1800000, category: 'INJECTION' },
  { id: '7', client: 'Ольга Новикова', service: 'Нейромышечный массаж', specialist: 'Наталья Васильева', time: new Date('2025-05-20T14:00:00'), status: 'CANCELLED', amount: 900000, category: 'MASSAGE' },
  { id: '8', client: 'Марина Зайцева', service: 'Глубокое увлажнение', specialist: 'Мария Петрова', time: new Date('2025-05-21T09:00:00'), status: 'CONFIRMED', amount: 550000, category: 'FACIAL' },
  { id: '9', client: 'Валерия Орлова', service: 'Контурная пластика', specialist: 'Дарья Смирнова', time: new Date('2025-05-21T11:30:00'), status: 'PENDING', amount: 2200000, category: 'INJECTION' },
  { id: '10', client: 'Юлия Миронова', service: 'RF-лифтинг', specialist: 'Ольга Козлова', time: new Date('2025-05-22T10:00:00'), status: 'CONFIRMED', amount: 1400000, category: 'LASER' },
];

const CATEGORIES = [
  { id: 'MASSAGE', label: 'Массаж' },
  { id: 'COSMETOLOGY', label: 'Косметология' },
  { id: 'INJECTION', label: 'Инъекции' },
  { id: 'LASER', label: 'Лазер' },
  { id: 'FACIAL', label: 'Уход за лицом' },
] as const;

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
type StatusFilter = typeof STATUSES[number];

// statusLabels is now computed dynamically via t() in the component

interface ApiAppointment {
  id: string;
  client?: { fullName?: string };
  clientName?: string;
  service?: { name?: string; category?: string };
  serviceName?: string;
  specialist?: { fullName?: string };
  specialistName?: string;
  startAt: string;
  status: string;
  totalAmount?: number;
  amount?: number;
  category?: string;
}

function normalize(raw: unknown): Booking[] | null {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && 'items' in (raw as Record<string, unknown>)
      ? (raw as { items: unknown[] }).items
      : null;
  if (!Array.isArray(list)) return null;
  return (list as ApiAppointment[]).map((a) => ({
    id: String(a.id),
    client: a.client?.fullName ?? a.clientName ?? 'Клиент',
    service: a.service?.name ?? a.serviceName ?? 'Услуга',
    specialist: a.specialist?.fullName ?? a.specialistName ?? '—',
    time: new Date(a.startAt),
    status: a.status,
    amount: a.totalAmount ?? a.amount ?? 0,
    category: a.category ?? a.service?.category,
  }));
}

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>(mockBookings);
  const [filter, setFilter] = React.useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [specialistFilter, setSpecialistFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentLike | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const t = useT();

  const specialists = React.useMemo(() => {
    const names = Array.from(new Set(bookings.map((b) => b.specialist).filter((s) => s !== '—')));
    return names.sort();
  }, [bookings]);

  const statusLabels: Record<StatusFilter, string> = {
    ALL: t('filter.all'),
    PENDING: t('filter.pending'),
    CONFIRMED: t('filter.confirmed'),
    COMPLETED: t('filter.completed'),
    CANCELLED: t('filter.cancelled'),
  };

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/api/appointments?limit=100', { silent: true });
      const rows = normalize(data);
      if (rows && rows.length > 0) setBookings(rows);
    } catch {
      // keep mock
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const filtered = React.useMemo(() => {
    return bookings.filter((b) => {
      if (filter !== 'ALL' && b.status !== filter) return false;
      if (categoryFilter && b.category !== categoryFilter) return false;
      if (specialistFilter && b.specialist !== specialistFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!b.client.toLowerCase().includes(q) && !b.service.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [bookings, filter, categoryFilter, specialistFilter, search]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('page.bookings')}</h2>
          <p className="text-text-secondary mt-1 text-sm">Управление записями клиентов</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Filter className="w-4 h-4" />} onClick={() => setShowFilters((v) => !v)}>
            {t('btn.filters')}
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            {t('btn.newBooking')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего записей', value: bookings.length },
          { label: 'Подтверждено', value: bookings.filter((b) => b.status === 'CONFIRMED').length },
          { label: 'Ожидают', value: bookings.filter((b) => b.status === 'PENDING').length },
          { label: 'Завершено', value: bookings.filter((b) => b.status === 'COMPLETED').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-xs text-text-tertiary">{label}</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {showFilters && (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-4 space-y-4">
          {/* Status filter */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-2">Статус</p>
            <div className="flex items-center gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    filter === s
                      ? 'bg-champagne/8 text-champagne border-champagne/30'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40',
                  )}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-2">Категория</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter('')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  !categoryFilter
                    ? 'bg-champagne/8 text-champagne border-champagne/30'
                    : 'border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40',
                )}
              >
                Все
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    categoryFilter === cat.id
                      ? 'bg-champagne/8 text-champagne border-champagne/30'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specialist filter */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-2">Специалист</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSpecialistFilter('')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  !specialistFilter
                    ? 'bg-champagne/8 text-champagne border-champagne/30'
                    : 'border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40',
                )}
              >
                Все
              </button>
              {specialists.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSpecialistFilter(specialistFilter === sp ? '' : sp)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    specialistFilter === sp
                      ? 'bg-champagne/8 text-champagne border-champagne/30'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:border-champagne/40',
                  )}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter summary + clear */}
          {(filter !== 'ALL' || categoryFilter || specialistFilter) && (
            <div className="flex items-center justify-between pt-1 border-t border-border-luxury">
              <span className="text-xs text-text-tertiary">
                Активных фильтров: {[filter !== 'ALL', !!categoryFilter, !!specialistFilter].filter(Boolean).length}
              </span>
              <button
                onClick={() => { setFilter('ALL'); setCategoryFilter(''); setSpecialistFilter(''); }}
                className="text-xs text-champagne hover:underline transition-colors"
              >
                Сбросить все
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-champagne" />
            <h3 className="font-serif text-base font-medium text-text-primary">Все записи</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="bg-charcoal border border-border-luxury rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 w-40"
              />
            </div>
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Специалист</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Дата/Время</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {filtered.map((booking) => (
                <tr key={booking.id} onClick={() => setSelected(booking)} className="hover:bg-charcoal/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={booking.client} size="sm" />
                      <span className="font-medium text-text-primary whitespace-nowrap">{booking.client}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">{booking.service}</td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap">{booking.specialist}</td>
                  <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums" suppressHydrationWarning>
                    <div suppressHydrationWarning>{formatDate(booking.time)}</div>
                    <div className="text-xs text-text-tertiary" suppressHydrationWarning>{formatTime(booking.time)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={getAppointmentStatusBadgeVariant(booking.status)} dot>
                      {getAppointmentStatusLabel(booking.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">{formatCurrency(booking.amount)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-text-tertiary">Записей не найдено</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-border-luxury">
          {filtered.map((booking) => (
            <button key={booking.id} onClick={() => setSelected(booking)} className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-charcoal/50 transition-colors">
              <Avatar name={booking.client} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary text-sm truncate">{booking.client}</span>
                  <Badge variant={getAppointmentStatusBadgeVariant(booking.status)}>{getAppointmentStatusLabel(booking.status)}</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{booking.service}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-tertiary" suppressHydrationWarning>{formatTime(booking.time)}</span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">{booking.specialist}</span>
                  <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(booking.amount)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <CreateAppointmentDialog open={showCreate} onOpenChange={setShowCreate} onCreated={load} />
      <AppointmentDetailDialog
        appointment={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        onChanged={load}
      />
    </div>
  );
}
