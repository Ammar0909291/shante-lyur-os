'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, Plus, X, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatTime, formatCurrency } from '@/lib/utils';

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  specialistName: string;
  locationName: string;
  startAt: string;
  status: string;
  totalPrice: number;
  totalDuration: number;
  services: { name: string }[];
}

interface Specialist { id: string; firstName: string; lastName: string; specialization: string | null; }
interface Service { id: string; name: string; basePrice: number; baseDuration: number; }
interface Location { id: string; name: string; }
interface Client { id: string; firstName: string; lastName: string; email: string; phone?: string | null; clientRef?: string; }

const STATUS_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'PENDING', label: 'Ожидание' },
  { value: 'CONFIRMED', label: 'Подтверждено' },
  { value: 'IN_PROGRESS', label: 'В процессе' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
];

function timeOptions() {
  const opts: { label: string; value: string }[] = [];
  for (let h = 7; h < 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` });
    }
  }
  return opts;
}

const TIME_OPTIONS = timeOptions();
const LIMIT = 50;

const inputCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm',
  'bg-obsidian border border-border-luxury',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);

const selectCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm cursor-pointer',
  'bg-obsidian border border-border-luxury',
  'text-text-primary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const display = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Выберите дату';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          inputCls,
          'flex items-center justify-between text-left',
          !value && 'text-text-tertiary',
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-text-tertiary shrink-0" />
          {display}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg z-30 animate-slide-down">
          <Calendar
            value={value}
            onChange={(v) => { onChange(v); setOpen(false); }}
            minDate={(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })()}
          />
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [showModal, setShowModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [clientSearch, setClientSearch] = React.useState('');
  const [clients, setClients] = React.useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [clientDropdown, setClientDropdown] = React.useState(false);
  const [clientLoading, setClientLoading] = React.useState(false);

  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [createError, setCreateError] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const [form, setForm] = React.useState({
    specialistId: '',
    locationId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    notes: '',
  });

  const totalPages = Math.ceil(total / LIMIT);

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) q.set('status', statusFilter);
      const res = await fetch(`/api/admin/bookings?${q}`);
      const json = await res.json();
      if (json.success) {
        setBookings(json.data.items);
        setTotal(json.data.total);
      }
    } catch {
      // leave existing data
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  React.useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const fetchFormData = React.useCallback(async () => {
    const [specRes, svcRes, locRes] = await Promise.all([
      fetch('/api/specialists?limit=100&status=ACTIVE'),
      fetch('/api/catalog'),
      fetch('/api/locations'),
    ]);
    const [specJson, svcJson, locJson] = await Promise.all([specRes.json(), svcRes.json(), locRes.json()]);
    if (specJson.success) setSpecialists(specJson.data.items ?? []);
    if (svcJson.success) setServices(Array.isArray(svcJson.data) ? svcJson.data : (svcJson.data?.items ?? []));
    if (locJson.success) setLocations(locJson.data ?? []);
  }, []);

  React.useEffect(() => {
    if (showModal) fetchFormData();
  }, [showModal, fetchFormData]);

  // Client search with debounce — shows recent clients when empty
  React.useEffect(() => {
    if (!clientDropdown) return;
    setClientLoading(true);
    const timer = setTimeout(async () => {
      try {
        const url = clientSearch.trim()
          ? `/api/clients/search?q=${encodeURIComponent(clientSearch)}&limit=10`
          : `/api/clients/search?limit=10`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) setClients(json.data.items);
      } catch {
        // ignore
      } finally {
        setClientLoading(false);
      }
    }, clientSearch.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [clientSearch, clientDropdown]);

  const handleCreateClient = async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) { setCreateError('Имя и фамилия обязательны'); return; }
    if (!createForm.phone.trim()) { setCreateError('Телефон обязателен'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          phone: createForm.phone.trim(),
          email: createForm.email.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) { setCreateError(json.error?.message ?? 'Ошибка создания'); return; }
      setSelectedClient(json.data);
      setClientDropdown(false);
      setClientSearch('');
      setClients([]);
      setShowCreateForm(false);
      setCreateForm({ firstName: '', lastName: '', phone: '', email: '' });
    } catch {
      setCreateError('Сетевая ошибка');
    } finally {
      setCreating(false);
    }
  };

  const selectedService = services.find((s) => s.id === form.serviceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) { setFormError('Выберите клиента'); return; }
    if (!form.specialistId) { setFormError('Выберите специалиста'); return; }
    if (!form.locationId) { setFormError('Выберите локацию'); return; }
    if (!selectedService) { setFormError('Выберите услугу'); return; }
    if (!form.date) { setFormError('Выберите дату'); return; }

    setSubmitting(true);
    setFormError('');

    const startAt = new Date(`${form.date}T${form.time}:00`);

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          specialistId: form.specialistId,
          locationId: form.locationId,
          startAt: startAt.toISOString(),
          services: [{ serviceId: selectedService.id, price: selectedService.basePrice, duration: selectedService.baseDuration, sortOrder: 0 }],
          notes: form.notes.trim() || undefined,
          source: 'admin',
        }),
      });

      const json = await res.json();
      if (!json.success) { setFormError(json.error?.message ?? 'Ошибка создания записи'); return; }

      setShowModal(false);
      setSelectedClient(null);
      setClientSearch('');
      setForm((f) => ({ ...f, specialistId: '', locationId: '', serviceId: '', notes: '' }));
      fetchBookings();
    } catch {
      setFormError('Сетевая ошибка. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
    setSelectedClient(null);
    setClientSearch('');
    setClients([]);
    setShowCreateForm(false);
    setCreateError('');
    setCreateForm({ firstName: '', lastName: '', phone: '', email: '' });
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Записи</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {loading ? 'Загрузка...' : `${total.toLocaleString('ru-RU')} записей`}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Новая запись
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
              statusFilter === f.value
                ? 'bg-champagne text-obsidian font-medium'
                : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <CalendarIcon className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">Записей нет</p>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Создать запись
          </Button>
        </div>
      ) : (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Специалист</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Время</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-charcoal/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.clientName} size="sm" />
                        <span className="font-medium text-text-primary whitespace-nowrap">{b.clientName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">{b.services[0]?.name ?? '—'}</td>
                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap">{b.specialistName}</td>
                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">{formatTime(new Date(b.startAt))}</td>
                    <td className="px-4 py-4">
                      <Badge variant={getAppointmentStatusBadgeVariant(b.status)} dot>
                        {getAppointmentStatusLabel(b.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                      {formatCurrency(b.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border-luxury">
            {bookings.map((b) => (
              <div key={b.id} className="px-4 py-4 flex items-start gap-3">
                <Avatar name={b.clientName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary text-sm truncate">{b.clientName}</span>
                    <Badge variant={getAppointmentStatusBadgeVariant(b.status)}>
                      {getAppointmentStatusLabel(b.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{b.services[0]?.name ?? '—'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">{formatTime(new Date(b.startAt))}</span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-tertiary">{b.specialistName}</span>
                    <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(b.totalPrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-text-tertiary">Страница {page} из {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)}>← Назад</Button>}
            {page < totalPages && <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>Вперёд →</Button>}
          </div>
        </div>
      )}

      {/* Create booking modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-luxury-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Новая запись</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Client search */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Клиент *</span>
                {selectedClient ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-obsidian border border-champagne/40">
                    <Avatar name={`${selectedClient.firstName} ${selectedClient.lastName}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{selectedClient.firstName} {selectedClient.lastName}</span>
                        {selectedClient.clientRef && (
                          <span className="text-[10px] font-mono text-champagne bg-champagne/10 px-1.5 py-0.5 rounded">{selectedClient.clientRef}</span>
                        )}
                      </div>
                      {selectedClient.phone && <p className="text-xs text-text-tertiary">{selectedClient.phone}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedClient(null); setClientSearch(''); setClients([]); }}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                    <input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setClientDropdown(true); setShowCreateForm(false); }}
                      onFocus={() => { setClientDropdown(true); setShowCreateForm(false); }}
                      onBlur={() => setTimeout(() => setClientDropdown(false), 200)}
                      placeholder="Имя, email или телефон..."
                      className={cn(inputCls, 'pl-10')}
                      autoComplete="off"
                    />
                    {clientLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
                    )}
                    {clientDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg z-30 max-h-72 overflow-y-auto animate-slide-down">
                        {!clientSearch.trim() && clients.length > 0 && (
                          <p className="px-3 pt-2.5 pb-1 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Недавние клиенты</p>
                        )}
                        {clients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              setSelectedClient(c);
                              setClientDropdown(false);
                              setClientSearch('');
                              setClients([]);
                              setShowCreateForm(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-charcoal transition-colors text-left"
                          >
                            <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-text-primary">{c.firstName} {c.lastName}</p>
                                {c.clientRef && (
                                  <span className="text-[10px] font-mono text-champagne bg-champagne/10 px-1.5 py-0.5 rounded">{c.clientRef}</span>
                                )}
                              </div>
                              <p className="text-xs text-text-tertiary">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                            </div>
                          </button>
                        ))}
                        {clientSearch.trim() && !clientLoading && clients.length === 0 && !showCreateForm && (
                          <div className="px-3 py-3 text-center">
                            <p className="text-sm text-text-tertiary mb-2">Клиент не найден</p>
                          </div>
                        )}
                        {!showCreateForm ? (
                          <button
                            type="button"
                            onMouseDown={() => { setShowCreateForm(true); setCreateError(''); setCreateForm({ firstName: '', lastName: '', phone: '', email: '' }); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-champagne hover:bg-charcoal transition-colors border-t border-border-luxury"
                          >
                            <Plus className="w-4 h-4" />
                            Создать нового клиента
                          </button>
                        ) : (
                          <div className="p-3 border-t border-border-luxury space-y-2.5">
                            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Новый клиент</p>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={createForm.firstName}
                                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                                placeholder="Имя *"
                                className={cn(inputCls, 'py-2 text-xs')}
                                autoFocus
                              />
                              <input
                                value={createForm.lastName}
                                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                                placeholder="Фамилия *"
                                className={cn(inputCls, 'py-2 text-xs')}
                              />
                            </div>
                            <input
                              value={createForm.phone}
                              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                              placeholder="Телефон *"
                              className={cn(inputCls, 'py-2 text-xs')}
                            />
                            <input
                              value={createForm.email}
                              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                              placeholder="Email (необязательно)"
                              className={cn(inputCls, 'py-2 text-xs')}
                            />
                            {createError && <p className="text-xs text-red-400">{createError}</p>}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="flex-1 py-1.5 rounded-lg border border-border-luxury text-xs text-text-secondary hover:text-text-primary transition-colors"
                              >
                                Отмена
                              </button>
                              <button
                                type="button"
                                onClick={handleCreateClient}
                                disabled={creating}
                                className="flex-1 py-1.5 rounded-lg bg-champagne text-obsidian text-xs font-medium hover:bg-champagne-light transition-colors disabled:opacity-50"
                              >
                                {creating ? 'Создание...' : 'Создать'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Specialist */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Специалист *</span>
                <select required value={form.specialistId} onChange={(e) => setForm((f) => ({ ...f, specialistId: e.target.value }))} className={selectCls}>
                  <option value="">Выберите специалиста</option>
                  {specialists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}{s.specialization ? ` — ${s.specialization}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {/* Service */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Услуга *</span>
                <select required value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} className={selectCls}>
                  <option value="">Выберите услугу</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.baseDuration} мин · {s.basePrice.toLocaleString('ru-RU')} ₽</option>
                  ))}
                </select>
              </label>

              {/* Location */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Локация *</span>
                <select required value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))} className={selectCls}>
                  <option value="">Выберите локацию</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </label>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Дата *</span>
                  <DatePickerField value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
                </div>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Время *</span>
                  <select required value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className={selectCls}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedService && (
                <div className="px-4 py-3 rounded-xl bg-charcoal/50 border border-border-luxury text-sm">
                  <p className="text-text-secondary">
                    Длительность: <span className="text-text-primary font-medium">{selectedService.baseDuration} мин</span>
                    {' · '}
                    Стоимость: <span className="text-champagne font-medium">{selectedService.basePrice.toLocaleString('ru-RU')} ₽</span>
                  </p>
                </div>
              )}

              {/* Notes */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Примечания</span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Особые пожелания..."
                  className={cn(inputCls, 'resize-none')}
                />
              </label>

              {formError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Отмена</Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
                  {submitting ? 'Создание...' : 'Создать запись'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
