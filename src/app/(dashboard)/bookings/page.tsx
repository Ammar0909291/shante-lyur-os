'use client';

import * as React from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal, Calendar as CalendarIcon, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

type AppointmentStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Appointment {
  id: string;
  client: string;
  service: string;
  specialist: string;
  dateTime: Date;
  duration: number;
  status: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'REFUNDED';
  amount: number;
}

const initialBookings: Appointment[] = [
  { id: 'b1', client: 'Анна Соколова', service: 'Гиалуроновый лифтинг', specialist: 'Мария Петрова', dateTime: new Date('2025-05-17T09:00:00'), duration: 60, status: 'CONFIRMED', paymentStatus: 'PAID', amount: 12_00000 },
  { id: 'b2', client: 'Елена Морозова', service: 'Антивозрастной массаж лица', specialist: 'Ольга Климова', dateTime: new Date('2025-05-17T10:30:00'), duration: 45, status: 'CONFIRMED', paymentStatus: 'UNPAID', amount: 8_00000 },
  { id: 'b3', client: 'Светлана Ким', service: 'Пилинг & Детокс', specialist: 'Мария Петрова', dateTime: new Date('2025-05-17T11:00:00'), duration: 90, status: 'PENDING', paymentStatus: 'UNPAID', amount: 6_50000 },
  { id: 'b4', client: 'Ирина Волкова', service: 'Ароматерапевтический массаж', specialist: 'Наталья Волкова', dateTime: new Date('2025-05-16T12:00:00'), duration: 60, status: 'COMPLETED', paymentStatus: 'PAID', amount: 7_00000 },
  { id: 'b5', client: 'Татьяна Лебедева', service: 'Лазерная эпиляция', specialist: 'Ольга Климова', dateTime: new Date('2025-05-16T13:30:00'), duration: 120, status: 'CONFIRMED', paymentStatus: 'PAID', amount: 15_00000 },
  { id: 'b6', client: 'Наталья Попова', service: 'Биоревитализация', specialist: 'Дарья Светлова', dateTime: new Date('2025-05-16T14:00:00'), duration: 75, status: 'PENDING', paymentStatus: 'UNPAID', amount: 18_00000 },
  { id: 'b7', client: 'Ольга Новикова', service: 'Нейромышечный массаж', specialist: 'Наталья Волкова', dateTime: new Date('2025-05-15T15:00:00'), duration: 60, status: 'CANCELLED', paymentStatus: 'REFUNDED', amount: 9_00000 },
  { id: 'b8', client: 'Марина Зайцева', service: 'Глубокое увлажнение', specialist: 'Мария Петрова', dateTime: new Date('2025-05-15T16:00:00'), duration: 45, status: 'COMPLETED', paymentStatus: 'PAID', amount: 5_50000 },
  { id: 'b9', client: 'Юлия Кузнецова', service: 'Контурная пластика', specialist: 'Дарья Светлова', dateTime: new Date('2025-05-15T10:00:00'), duration: 90, status: 'NO_SHOW', paymentStatus: 'UNPAID', amount: 22_00000 },
  { id: 'b10', client: 'Валерия Орлова', service: 'Лимфодренажный массаж', specialist: 'Наталья Волкова', dateTime: new Date('2025-05-14T11:30:00'), duration: 60, status: 'COMPLETED', paymentStatus: 'PAID', amount: 6_00000 },
];

const statusFilters: { value: AppointmentStatus; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'PENDING', label: 'Ожидание' },
  { value: 'CONFIRMED', label: 'Подтверждено' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
  { value: 'NO_SHOW', label: 'Не явился' },
];

const PAGE_SIZE = 8;

// Inline new-booking modal
function NewBookingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (apt: Appointment) => void;
}) {
  const [clientName, setClientName] = React.useState('');
  const [service, setService] = React.useState('');
  const [specialist, setSpecialist] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  function reset() {
    setClientName(''); setService(''); setSpecialist('');
    setDate(''); setTime(''); setError('');
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !service.trim() || !date || !time) {
      setError('Заполните все обязательные поля');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const scheduledAt = new Date(`${date}T${time}`);
      // Optimistically add to local list (API call would require DB-backed IDs)
      const newApt: Appointment = {
        id: `local-${Date.now()}`,
        client: clientName.trim(),
        service: service.trim(),
        specialist: specialist.trim() || 'Не назначен',
        dateTime: scheduledAt,
        duration: 60,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        amount: 0,
      };
      onCreated(newApt);
      handleClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md bg-onyx border border-border-luxury rounded-2xl shadow-luxury-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Новая запись</h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Имя клиента *</label>
            <Input placeholder="Анна Соколова" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Услуга *</label>
            <Input placeholder="Гиалуроновый лифтинг" value={service} onChange={(e) => setService(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Специалист</label>
            <Input placeholder="Мария Петрова" value={specialist} onChange={(e) => setSpecialist(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Дата *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Время *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="md" onClick={handleClose}>Отмена</Button>
            <Button type="submit" variant="primary" size="md" disabled={loading}>
              {loading ? 'Создание...' : 'Создать запись'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Action dropdown for a single appointment row
function AppointmentMenu({
  apt,
  onStatusChange,
  onCancel,
}: {
  apt: Appointment;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const actions: Array<{ label: string; status?: string; danger?: boolean }> = [];
  if (apt.status === 'PENDING') actions.push({ label: 'Подтвердить', status: 'CONFIRMED' });
  if (apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED') actions.push({ label: 'Завершить', status: 'COMPLETED' });
  if (apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED') actions.push({ label: 'Отменить', danger: true });

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Действия"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-36 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg overflow-hidden animate-slide-down">
          {actions.map(({ label, status, danger }) => (
            <button
              key={label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (danger) onCancel(apt.id);
                else if (status) onStatusChange(apt.id, status);
              }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>(initialBookings);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<AppointmentStatus>('ALL');
  const [page, setPage] = React.useState(1);
  const [showNewBooking, setShowNewBooking] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const filtered = React.useMemo(() => {
    return appointments.filter((b) => {
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        b.client.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q) ||
        b.specialist.toLowerCase().includes(q);
      const matchesFrom = !dateFrom || b.dateTime >= new Date(dateFrom);
      const matchesTo = !dateTo || b.dateTime <= new Date(`${dateTo}T23:59:59`);
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [appointments, search, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, statusFilter, dateFrom, dateTo]);

  function handleStatusChange(id: string, status: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    // Fire API call; failures are silent since this may run without a DB
    fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  function handleCancel(id: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a))
    );
    fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'CLIENT_REQUEST' }),
    }).catch(() => {});
  }

  function handleCreated(apt: Appointment) {
    setAppointments((prev) => [apt, ...prev]);
  }

  return (
    <>
      <NewBookingModal open={showNewBooking} onClose={() => setShowNewBooking(false)} onCreated={handleCreated} />

      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">Управление записями</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'запись' : 'записей'}
            </p>
          </div>
          <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNewBooking(true)}>
            Новая запись
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-onyx border border-border-luxury rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Поиск по клиенту, услуге, специалисту..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftAddon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="md"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters((v) => !v)}
            >
              Фильтры
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<CalendarIcon className="w-4 h-4" />}
              rightIcon={<ChevronDown className="w-3.5 h-3.5" />}
              onClick={() => setShowFilters((v) => !v)}
            >
              Период
            </Button>
          </div>

          {/* Expanded date filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-border-luxury animate-slide-down">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Дата от</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Дата до</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne"
                />
              </div>
              {(dateFrom || dateTo) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="md" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                    Сбросить
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
                  statusFilter === value
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
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-charcoal flex items-center justify-center">
                <CalendarIcon className="w-7 h-7 text-text-tertiary" />
              </div>
              <div className="text-center">
                <p className="font-serif text-lg text-text-primary">Записей не найдено</p>
                <p className="text-sm text-text-secondary mt-1">Попробуйте изменить фильтры или создайте новую запись</p>
              </div>
              <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNewBooking(true)}>
                Новая запись
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      {['Клиент', 'Услуга', 'Специалист', 'Дата и время', 'Статус', 'Оплата', 'Сумма', ''].map((col) => (
                        <th key={col} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary first:pl-6 last:pr-6 last:text-right">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury">
                    {paginated.map((apt) => (
                      <tr key={apt.id} className="hover:bg-charcoal/40 transition-colors group">
                        <td className="pl-6 pr-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={apt.client} size="sm" />
                            <span className="font-medium text-text-primary whitespace-nowrap">{apt.client}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-text-secondary max-w-[160px]">
                          <span className="truncate block">{apt.service}</span>
                          <span className="text-xs text-text-tertiary">{apt.duration} мин</span>
                        </td>
                        <td className="px-4 py-4 text-text-secondary whitespace-nowrap">{apt.specialist}</td>
                        <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">{formatDateTime(apt.dateTime)}</td>
                        <td className="px-4 py-4">
                          <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                            {getAppointmentStatusLabel(apt.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={apt.paymentStatus === 'PAID' ? 'paid' : apt.paymentStatus === 'REFUNDED' ? 'refunded' : 'unpaid'}>
                            {apt.paymentStatus === 'PAID' ? 'Оплачено' : apt.paymentStatus === 'REFUNDED' ? 'Возврат' : 'Не оплачено'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 pr-2 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                          {formatCurrency(apt.amount)}
                        </td>
                        <td className="pr-4 py-4">
                          <AppointmentMenu apt={apt} onStatusChange={handleStatusChange} onCancel={handleCancel} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border-luxury">
                {paginated.map((apt) => (
                  <div key={apt.id} className="p-4 flex items-start gap-3">
                    <Avatar name={apt.client} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-text-primary text-sm">{apt.client}</p>
                          <p className="text-xs text-text-secondary mt-0.5 truncate">{apt.service}</p>
                        </div>
                        <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                          {getAppointmentStatusLabel(apt.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                        <span className="text-xs text-text-tertiary">{formatDateTime(apt.dateTime)}</span>
                        <span className="text-xs text-text-tertiary">· {apt.specialist}</span>
                        <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(apt.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border-luxury">
                  <p className="text-sm text-text-tertiary">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} из {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-charcoal disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      aria-label="Предыдущая страница"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                          p === page
                            ? 'bg-champagne/10 text-champagne border border-champagne/20'
                            : 'text-text-secondary hover:text-text-primary hover:bg-charcoal',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-charcoal disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      aria-label="Следующая страница"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
