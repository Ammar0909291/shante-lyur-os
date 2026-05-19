'use client';

import * as React from 'react';
import { Plus, Search, Calendar, Clock, Filter, MoreVertical, CheckCircle, Play, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-fetch';
import { cn, formatTime, formatCurrency } from '@/lib/utils';

// ── Time slot generation (:00/:15/:30/:45 only) ────────────────────────────

function generateTimeSlots(startHour = 8, endHour = 21) {
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

// ── Types ──────────────────────────────────────────────────────────────────

interface AppointmentItem {
  id: string;
  clientId: string;
  clientName: string;
  specialistId: string;
  specialistName: string;
  locationId: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName: string;
  services: Array<{ serviceId: string; name: string; price: number; duration: number }>;
  totalPrice: number;
  totalDuration: number;
  notes: string | null;
}

interface SpecialistOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ServiceOption {
  serviceId: string;
  name: string;
  basePrice: number;
  baseDuration: number;
  priceOverride: number | null;
  durationOverride: number | null;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ── Label field ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
      {children}
    </label>
  );
}

function selectCls(hasError = false) {
  return cn(
    'w-full h-11 rounded-lg px-3 text-sm',
    'bg-charcoal border border-border-luxury text-text-primary',
    'focus:outline-none focus:border-champagne',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    hasError && 'border-red-500/60',
  );
}

// ── New Booking Modal ──────────────────────────────────────────────────────

function NewBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (apt: AppointmentItem) => void;
}) {
  const [date, setDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = React.useState('09:00');
  const [specialistId, setSpecialistId] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [clientSearch, setClientSearch] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [specialists, setSpecialists] = React.useState<SpecialistOption[]>([]);
  const [services, setServices] = React.useState<ServiceOption[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [locationId, setLocationId] = React.useState('');

  const [loadingSpecialists, setLoadingSpecialists] = React.useState(true);
  const [loadingServices, setLoadingServices] = React.useState(false);
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load specialists, customers, and location on mount
  React.useEffect(() => {
    async function loadInitial() {
      const [specRes, custRes, locRes] = await Promise.all([
        apiFetch('/api/admin/specialists?limit=100&status=ACTIVE'),
        apiFetch('/api/customers?limit=200'),
        apiFetch('/api/locations?limit=1'),
      ]);
      const [specJson, custJson, locJson] = await Promise.all([
        specRes.json(), custRes.json(), locRes.json(),
      ]);

      if (specJson.success) {
        setSpecialists(specJson.data?.items ?? []);
      }
      if (custJson.success) {
        setCustomers((custJson.data?.items ?? custJson.data ?? []) as CustomerOption[]);
      }
      if (locJson.success) {
        const locs = locJson.data?.items ?? [];
        if (locs.length > 0) setLocationId(locs[0].id as string);
      }
      setLoadingSpecialists(false);
      setLoadingCustomers(false);
    }
    loadInitial();
  }, []);

  // Load specialist's services when specialist changes
  React.useEffect(() => {
    if (!specialistId) { setServices([]); setServiceId(''); return; }
    setLoadingServices(true);
    setServiceId('');
    apiFetch(`/api/admin/specialists/${specialistId}/services`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setServices(j.data?.items ?? []);
      })
      .finally(() => setLoadingServices(false));
  }, [specialistId]);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, submitting]);

  const filteredCustomers = React.useMemo(() => {
    if (!clientSearch.trim()) return customers.slice(0, 50);
    const q = clientSearch.toLowerCase();
    return customers
      .filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      )
      .slice(0, 20);
  }, [customers, clientSearch]);

  const selectedService = services.find(s => s.serviceId === serviceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) { setError('Выберите клиента'); return; }
    if (!specialistId) { setError('Выберите специалиста'); return; }
    if (!serviceId || !selectedService) { setError('Выберите услугу'); return; }
    if (!locationId) { setError('Нет доступных локаций'); return; }

    const startAt = new Date(`${date}T${time}:00`);
    const [, m] = time.split(':').map(Number);
    if (![0, 15, 30, 45].includes(m)) {
      setError('Время должно быть кратно 15 минутам (:00, :15, :30, :45)');
      return;
    }

    setSubmitting(true);
    try {
      const effectivePrice = selectedService.priceOverride ?? selectedService.basePrice;
      const effectiveDuration = selectedService.durationOverride ?? selectedService.baseDuration;

      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          specialistId,
          locationId,
          startAt: startAt.toISOString(),
          services: [{
            serviceId,
            price: effectivePrice,
            duration: effectiveDuration,
            sortOrder: 0,
          }],
          notes: notes.trim() || undefined,
          source: 'admin',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Не удалось создать запись');
        return;
      }

      onCreated(json.data as AppointmentItem);
      onClose();
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-booking-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h2 id="new-booking-title" className="font-serif text-lg font-medium text-text-primary">Новая запись</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-40"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Дата</FieldLabel>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={cn(selectCls(), '[color-scheme:dark]')}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>
                Время <span className="text-champagne text-[10px] normal-case tracking-normal">(:00/:15/:30/:45)</span>
              </FieldLabel>
              <select value={time} onChange={e => setTime(e.target.value)} className={selectCls()}>
                {TIME_SLOTS.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specialist */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Специалист</FieldLabel>
            <select
              value={specialistId}
              onChange={e => setSpecialistId(e.target.value)}
              disabled={loadingSpecialists || submitting}
              className={selectCls()}
              required
            >
              <option value="">{loadingSpecialists ? 'Загрузка...' : 'Выберите специалиста'}</option>
              {specialists.map(s => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Услуга</FieldLabel>
            <select
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              disabled={!specialistId || loadingServices || submitting}
              className={selectCls()}
              required
            >
              <option value="">
                {!specialistId ? 'Сначала выберите специалиста' :
                  loadingServices ? 'Загрузка услуг...' :
                    services.length === 0 ? 'Нет привязанных услуг' : 'Выберите услугу'}
              </option>
              {services.map(s => {
                const price = s.priceOverride ?? s.basePrice;
                const duration = s.durationOverride ?? s.baseDuration;
                return (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.name} — {price.toLocaleString('ru-RU')} ₽ · {duration} мин
                  </option>
                );
              })}
            </select>
          </div>

          {/* Client search */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Клиент</FieldLabel>
            <input
              type="text"
              placeholder="Поиск по имени, email или телефону..."
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setClientId(''); }}
              disabled={loadingCustomers || submitting}
              className={cn(selectCls(), 'h-11')}
            />
            {clientSearch && filteredCustomers.length > 0 && !clientId && (
              <div className="rounded-lg border border-border-luxury bg-charcoal max-h-40 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setClientId(c.id); setClientSearch(`${c.firstName} ${c.lastName}`); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                  >
                    <span className="font-medium text-text-primary">{c.firstName} {c.lastName}</span>
                    <span className="text-text-tertiary ml-2 text-xs">{c.email}</span>
                  </button>
                ))}
              </div>
            )}
            {clientSearch && filteredCustomers.length === 0 && !clientId && (
              <p className="text-xs text-text-tertiary px-1">Клиент не найден</p>
            )}
            {clientId && (
              <p className="text-xs text-green-400 px-1">✓ Клиент выбран</p>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Примечание (необязательно)</FieldLabel>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={submitting}
              rows={2}
              placeholder="Особые пожелания клиента..."
              className={cn(
                'w-full rounded-lg px-4 py-3 text-sm resize-none',
                'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:border-champagne',
                'disabled:opacity-40',
              )}
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border-luxury">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={submitting} onClick={handleSubmit}>
            Создать запись
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Action menu for a booking row ──────────────────────────────────────────

function BookingActions({
  apt,
  onStatusChange,
  onCancel,
}: {
  apt: AppointmentItem;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const canConfirm   = apt.status === 'PENDING' || apt.status === 'RESCHEDULED';
  const canStart     = apt.status === 'CONFIRMED';
  const canComplete  = apt.status === 'IN_PROGRESS';
  const canNoShow    = apt.status === 'IN_PROGRESS';
  const canCancel    = ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status);

  if (!canConfirm && !canStart && !canComplete && !canNoShow && !canCancel) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
        aria-label="Действия"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-48 rounded-xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden">
          {canConfirm && (
            <button
              onClick={() => { setOpen(false); onStatusChange(apt.id, 'CONFIRMED'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-green-400 hover:bg-green-500/8 transition-colors text-left"
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              Подтвердить
            </button>
          )}
          {canStart && (
            <button
              onClick={() => { setOpen(false); onStatusChange(apt.id, 'IN_PROGRESS'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-champagne hover:bg-champagne/8 transition-colors text-left"
            >
              <Play className="w-3.5 h-3.5 shrink-0" />
              Начать приём
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => { setOpen(false); onStatusChange(apt.id, 'COMPLETED'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-green-400 hover:bg-green-500/8 transition-colors text-left"
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              Завершить
            </button>
          )}
          {canNoShow && (
            <button
              onClick={() => { setOpen(false); onStatusChange(apt.id, 'NO_SHOW'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-amber-400 hover:bg-amber-500/8 transition-colors text-left"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Не явился
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => { setOpen(false); onCancel(apt.id); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/8 transition-colors text-left border-t border-border-luxury mt-1"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              Отменить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Booking row ────────────────────────────────────────────────────────────

function BookingRow({
  apt,
  onStatusChange,
  onCancel,
}: {
  apt: AppointmentItem;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
}) {
  const startAt = new Date(apt.startAt);
  return (
    <tr className="hover:bg-charcoal/40 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={apt.clientName} size="sm" />
          <span className="font-medium text-text-primary text-sm whitespace-nowrap">{apt.clientName}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-text-secondary max-w-[150px] truncate">{apt.serviceName}</td>
      <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap">{apt.specialistName}</td>
      <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap tabular-nums">
        {formatTime(startAt)}
      </td>
      <td className="px-4 py-4">
        <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
          {getAppointmentStatusLabel(apt.status)}
        </Badge>
      </td>
      <td className="px-4 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap text-sm">
        {formatCurrency(apt.totalPrice)}
      </td>
      <td className="px-4 py-4 text-right">
        <BookingActions apt={apt} onStatusChange={onStatusChange} onCancel={onCancel} />
      </td>
    </tr>
  );
}

// ── Mobile booking card ────────────────────────────────────────────────────

function BookingCard({
  apt,
  onStatusChange,
  onCancel,
}: {
  apt: AppointmentItem;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
}) {
  const startAt = new Date(apt.startAt);
  return (
    <div className="px-4 py-4 border-b border-border-luxury last:border-0">
      <div className="flex items-start gap-3">
        <Avatar name={apt.clientName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text-primary text-sm truncate">{apt.clientName}</p>
            <BookingActions apt={apt} onStatusChange={onStatusChange} onCancel={onCancel} />
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{apt.serviceName} · {apt.specialistName}</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
              {getAppointmentStatusLabel(apt.status)}
            </Badge>
            <span className="text-xs text-text-tertiary tabular-nums">{formatTime(startAt)}</span>
            <span className="text-xs font-medium text-text-primary tabular-nums">{formatCurrency(apt.totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cancel confirmation dialog ─────────────────────────────────────────────

function CancelDialog({
  appointmentId,
  onConfirm,
  onDismiss,
  submitting,
}: {
  appointmentId: string;
  onConfirm: (id: string, reason: string) => void;
  onDismiss: () => void;
  submitting: boolean;
}) {
  const [reason, setReason] = React.useState('CLIENT_REQUEST');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-onyx border border-border-luxury shadow-2xl p-6 space-y-4">
        <h3 className="font-serif text-lg font-medium text-text-primary">Отменить запись?</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Причина</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={cn(
              'w-full h-11 rounded-lg px-3 text-sm',
              'bg-charcoal border border-border-luxury text-text-primary',
              'focus:outline-none focus:border-champagne',
            )}
          >
            <option value="CLIENT_REQUEST">По просьбе клиента</option>
            <option value="SPECIALIST_UNAVAILABLE">Специалист недоступен</option>
            <option value="EMERGENCY">Экстренная ситуация</option>
            <option value="OTHER">Другое</option>
          </select>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss} disabled={submitting}>Назад</Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={submitting}
            onClick={() => onConfirm(appointmentId, reason)}
            className="!bg-red-500/80 hover:!bg-red-500"
          >
            Отменить запись
          </Button>
        </div>
      </div>
    </div>
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
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [showModal, setShowModal] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(
    () => new Date().toISOString().split('T')[0],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Build query with correct parameter names (from/to, not startDate/endDate)
      const dayStart = `${selectedDate}T00:00:00.000Z`;
      const dayEnd   = `${selectedDate}T23:59:59.999Z`;
      const params = new URLSearchParams({ limit: '100', from: dayStart, to: dayEnd });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiFetch(`/api/appointments?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAppointments([]);
        if (res.status !== 404) setError(json.error?.message ?? 'Не удалось загрузить записи');
        return;
      }
      setAppointments(json.data?.items ?? []);
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
      a.serviceName.toLowerCase().includes(q),
    );
  }, [appointments, search]);

  async function handleStatusChange(id: string, status: string) {
    setActionError(null);
    const prev = appointments;
    // Optimistic update
    setAppointments(list => list.map(a => a.id === id ? { ...a, status } : a));
    try {
      const res = await apiFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAppointments(prev);
        const msg = json.error?.message ?? 'Не удалось изменить статус';
        setActionError(msg);
        setTimeout(() => setActionError(null), 5000);
      }
    } catch {
      setAppointments(prev);
      setActionError('Ошибка сети. Попробуйте ещё раз.');
      setTimeout(() => setActionError(null), 5000);
    }
  }

  async function handleCancel(id: string, reason: string) {
    setCancelling(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAppointments(list => list.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a));
        setCancelTarget(null);
      } else {
        setActionError(json.error?.message ?? 'Не удалось отменить запись');
        setTimeout(() => setActionError(null), 5000);
      }
    } catch {
      setActionError('Ошибка сети. Попробуйте ещё раз.');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setCancelling(false);
    }
  }

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

      {/* Action error banner */}
      {actionError && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between gap-3"
        >
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400/60 hover:text-red-400 text-xs" aria-label="Закрыть">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
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
                '[color-scheme:dark]',
              )}
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Поиск по клиенту, специалисту или услуге..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

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

      {/* Interval reminder */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-champagne/6 border border-champagne/20">
        <Clock className="w-4 h-4 text-champagne shrink-0" aria-hidden />
        <p className="text-xs text-text-secondary">
          <span className="text-champagne font-medium">Допустимые интервалы:</span>{' '}
          :00, :15, :30, :45 — каждые 15 минут
        </p>
      </div>

      {/* Content */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">Загрузка...</div>
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

        {/* Desktop table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  {['Клиент', 'Услуга', 'Специалист', 'Время', 'Статус', 'Сумма', ''].map((col, i) => (
                    <th
                      key={`${col}-${i}`}
                      className={cn(
                        'py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary',
                        i === 0 ? 'text-left px-6' : i === 6 ? 'text-right px-4' : 'text-left px-4',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {filtered.map(apt => (
                  <BookingRow
                    key={apt.id}
                    apt={apt}
                    onStatusChange={handleStatusChange}
                    onCancel={id => setCancelTarget(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="sm:hidden">
            {filtered.map(apt => (
              <BookingCard
                key={apt.id}
                apt={apt}
                onStatusChange={handleStatusChange}
                onCancel={id => setCancelTarget(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <NewBookingModal
          onClose={() => setShowModal(false)}
          onCreated={apt => setAppointments(prev => [apt, ...prev])}
        />
      )}
      {cancelTarget && (
        <CancelDialog
          appointmentId={cancelTarget}
          onConfirm={handleCancel}
          onDismiss={() => setCancelTarget(null)}
          submitting={cancelling}
        />
      )}
    </div>
  );
}
