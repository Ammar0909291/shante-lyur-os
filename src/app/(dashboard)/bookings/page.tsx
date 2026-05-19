'use client';

import * as React from 'react';
import { Plus, Search, Calendar, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-fetch';
import { cn, formatTime, formatCurrency } from '@/lib/utils';

// ── Time slot generation (:00/:15/:30/:45 only) ────────────────────────────

/** Generate all booking-valid time slots for a given day.
 *  Only :00, :15, :30, :45 minutes are valid per business rules. */
function generateTimeSlots(
  startHour = 8,
  endHour = 21,
): Array<{ label: string; value: string }> {
  const slots: Array<{ label: string; value: string }> = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (const m of [0, 15, 30, 45]) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots(8, 21);

/** Snap any Date to the nearest valid :00/:15/:30/:45 interval. */
function snapToValidMinute(date: Date): Date {
  const m = date.getMinutes();
  const snapped = Math.round(m / 15) * 15;
  const out = new Date(date);
  out.setMinutes(snapped % 60);
  if (snapped === 60) out.setHours(out.getHours() + 1);
  out.setSeconds(0, 0);
  return out;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface AppointmentItem {
  id: string;
  clientName: string;
  specialistName: string;
  service: string;
  startAt: string;
  status: string;
  totalPrice: number;
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ── New Booking Modal ──────────────────────────────────────────────────────

function NewBookingModal({ onClose }: { onClose: () => void }) {
  const [date, setDate] = React.useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = React.useState('09:00');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Validate selected time is a valid interval (:00/:15/:30/:45)
      const [, m] = time.split(':').map(Number);
      if (![0, 15, 30, 45].includes(m)) {
        setError('Время должно быть кратно 15 минутам (:00, :15, :30, :45)');
        return;
      }
      const startAt = new Date(`${date}T${time}:00`);
      const snapped = snapToValidMinute(startAt);
      if (snapped.getTime() !== startAt.getTime()) {
        setError(`Используйте интервалы: :00, :15, :30 или :45. Ближайший: ${String(snapped.getHours()).padStart(2,'0')}:${String(snapped.getMinutes()).padStart(2,'0')}`);
        return;
      }
      // Stub: booking creation API call would go here
      await new Promise(r => setTimeout(r, 500));
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h2 className="font-serif text-lg font-medium text-text-primary">Новая запись</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                Дата
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={cn(
                  'w-full h-11 rounded-lg px-3 text-sm',
                  'bg-charcoal border border-border-luxury text-text-primary',
                  'focus:outline-none focus:border-champagne',
                )}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                Время <span className="text-champagne text-[10px] normal-case">(:00/:15/:30/:45)</span>
              </label>
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                className={cn(
                  'w-full h-11 rounded-lg px-3 text-sm',
                  'bg-charcoal border border-border-luxury text-text-primary',
                  'focus:outline-none focus:border-champagne',
                )}
              >
                {TIME_SLOTS.map(slot => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg px-4 py-3 bg-charcoal border border-border-luxury">
            <p className="text-xs text-text-tertiary">
              <Clock className="w-3.5 h-3.5 inline mr-1.5" aria-hidden />
              Доступные интервалы: каждые 15 минут (:00, :15, :30, :45)
            </p>
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <p className="text-xs text-text-tertiary">
            Полная форма записи (выбор клиента, специалиста, услуги) будет доступна в следующей версии.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-luxury">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Создать запись
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Booking row ────────────────────────────────────────────────────────────

function BookingRow({ apt }: { apt: AppointmentItem }) {
  const startAt = new Date(apt.startAt);
  return (
    <tr className="hover:bg-charcoal/40 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={apt.clientName} size="sm" />
          <span className="font-medium text-text-primary text-sm whitespace-nowrap">{apt.clientName}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-text-secondary max-w-[160px] truncate">{apt.service}</td>
      <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap">{apt.specialistName}</td>
      <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap tabular-nums">
        {formatTime(startAt)}
      </td>
      <td className="px-4 py-4">
        <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
          {getAppointmentStatusLabel(apt.status)}
        </Badge>
      </td>
      <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap text-sm">
        {formatCurrency(apt.totalPrice)}
      </td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL',         label: 'Все' },
  { value: 'PENDING',     label: 'Ожидает' },
  { value: 'CONFIRMED',   label: 'Подтверждено' },
  { value: 'IN_PROGRESS', label: 'В процессе' },
  { value: 'COMPLETED',   label: 'Завершено' },
  { value: 'CANCELLED',   label: 'Отменено' },
];

export default function BookingsPage() {
  const [appointments, setAppointments] = React.useState<AppointmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [showModal, setShowModal] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(
    () => new Date().toISOString().split('T')[0],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', startDate: selectedDate, endDate: selectedDate });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiFetch(`/api/appointments?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAppointments([]);
        if (res.status !== 404) setError(json.error?.message ?? 'Не удалось загрузить записи');
        return;
      }
      // Normalize API response into display shape
      const items: AppointmentItem[] = (json.data?.items ?? []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        clientName: (a.clientName as string | undefined) ?? 'Клиент',
        specialistName: (a.specialistName as string | undefined) ?? 'Специалист',
        service: (a.serviceName as string | undefined) ?? '—',
        startAt: a.startAt as string,
        status: a.status as string,
        totalPrice: (a.totalPrice as number | undefined) ?? 0,
      }));
      setAppointments(items);
    } catch {
      setError('Не удалось загрузить записи');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [selectedDate, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = React.useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(a =>
      a.clientName.toLowerCase().includes(q) ||
      a.specialistName.toLowerCase().includes(q) ||
      a.service.toLowerCase().includes(q),
    );
  }, [appointments, search]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Записи</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Управление записями клиентов
            {!loading && appointments.length > 0 && (
              <span className="text-text-tertiary ml-2">· {filtered.length} из {appointments.length}</span>
            )}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Новая запись
        </Button>
      </div>

      {/* Date picker + search + status filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-tertiary shrink-0" aria-hidden />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className={cn(
                'h-10 rounded-lg px-3 text-sm',
                'bg-charcoal border border-border-luxury text-text-primary',
                'focus:outline-none focus:border-champagne',
              )}
            />
          </div>

          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Поиск по клиенту, специалисту или услуге..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-charcoal rounded-lg p-1 border border-border-luxury overflow-x-auto shrink-0">
          <Filter className="w-4 h-4 text-text-tertiary mx-2 shrink-0" aria-hidden />
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                statusFilter === f.value
                  ? 'bg-champagne/12 text-champagne'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/4',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time slot info */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-champagne/6 border border-champagne/20">
        <Clock className="w-4 h-4 text-champagne shrink-0" aria-hidden />
        <p className="text-xs text-text-secondary">
          <span className="text-champagne font-medium">Допустимые интервалы записи:</span>{' '}
          :00, :15, :30, :45 — каждые 15 минут
        </p>
      </div>

      {/* Content table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">
            Загрузка...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-text-secondary text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={load}>Повторить</Button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <p className="text-text-primary font-medium">Записей не найдено</p>
            <p className="text-text-tertiary text-sm">
              {appointments.length === 0
                ? 'На выбранную дату записей нет. Создайте первую запись.'
                : 'Попробуйте изменить фильтры или поисковый запрос.'}
            </p>
            {appointments.length === 0 && (
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
                Новая запись
              </Button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  {['Клиент', 'Услуга', 'Специалист', 'Время', 'Статус', 'Сумма'].map((col, i) => (
                    <th
                      key={col}
                      className={cn(
                        'py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary',
                        i === 0 ? 'text-left px-6' : i === 5 ? 'text-right px-6' : 'text-left px-4',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {filtered.map(apt => <BookingRow key={apt.id} apt={apt} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <NewBookingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
