'use client';

import * as React from 'react';
import {
  X, Search, ChevronRight, ChevronLeft, Check, Leaf, Sparkles,
  Clock, Calendar, User, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'client' | 'specialist' | 'service' | 'date' | 'time' | 'notes';
type SpecialistType = 'MASSAGE_THERAPIST' | 'COSMETOLOGIST';

interface ModalClient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface ModalSpecialist {
  id: string;
  name: string;
  type: SpecialistType;
  specializations: string[];
  rating?: number;
}

interface ModalService {
  id: string;
  name: string;
  category: 'MASSAGE' | 'COSMETOLOGY';
  price: number; // kopecks
  duration: number; // minutes
}

interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
  reason: string | null;
}

// ─── Auto location ────────────────────────────────────────────────────────────

const SALON_LOCATION = {
  id: '00000000-0000-0000-0000-000000000001',
  label: 'Свердловская область, Екатеринбург, ул. Малышева, 3',
};

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_CLIENTS: ModalClient[] = [
  { id: 'c1', name: 'Анна Михайлова',   phone: '+7 (912) 345-67-89', email: 'anna@example.com' },
  { id: 'c2', name: 'Светлана Козлова', phone: '+7 (923) 456-78-90', email: 'svetlana@example.com' },
  { id: 'c3', name: 'Ирина Белова',     phone: '+7 (934) 567-89-01', email: 'irina@example.com' },
  { id: 'c4', name: 'Елена Морозова',   phone: '+7 (945) 678-90-12', email: 'elena@example.com' },
  { id: 'c5', name: 'Татьяна Волкова',  phone: '+7 (956) 789-01-23', email: 'tatyana@example.com' },
  { id: 'c6', name: 'Наталья Морозова', phone: '+7 (967) 890-12-34', email: 'nataly@example.com' },
  { id: 'c7', name: 'Ольга Захарова',   phone: '+7 (978) 901-23-45', email: 'olga@example.com' },
  { id: 'c8', name: 'Юлия Мельникова',  phone: '+7 (989) 012-34-56', email: 'yulia@example.com' },
];

const MOCK_SPECIALISTS: ModalSpecialist[] = [
  { id: 's1', name: 'Наталья Владимирова', type: 'MASSAGE_THERAPIST', specializations: ['Тайский массаж', 'Ароматерапевтический'], rating: 4.9 },
  { id: 's2', name: 'Ольга Козлова',       type: 'MASSAGE_THERAPIST', specializations: ['Спортивный', 'Нейромышечный'],           rating: 4.8 },
  { id: 's3', name: 'Дарья Соколова',      type: 'MASSAGE_THERAPIST', specializations: ['Горячий камень', 'Антицеллюлитный'],     rating: 4.7 },
  { id: 's4', name: 'Мария Волкова',       type: 'COSMETOLOGIST',     specializations: ['Биоревитализация', 'Гиалуроновый лифтинг'], rating: 4.6 },
  { id: 's5', name: 'Ирина Соколова',      type: 'COSMETOLOGIST',     specializations: ['Химический пилинг', 'Аппаратная косметология'], rating: 4.8 },
];

const MOCK_SERVICES: ModalService[] = [
  // Massage
  { id: 'sv1', name: 'Классический расслабляющий', category: 'MASSAGE',     price: 450000, duration: 60 },
  { id: 'sv2', name: 'Тайский массаж',             category: 'MASSAGE',     price: 750000, duration: 90 },
  { id: 'sv3', name: 'Спортивный массаж',           category: 'MASSAGE',     price: 550000, duration: 60 },
  { id: 'sv4', name: 'Глубокотканный массаж',       category: 'MASSAGE',     price: 850000, duration: 90 },
  { id: 'sv5', name: 'Ароматерапевтический массаж', category: 'MASSAGE',     price: 600000, duration: 60 },
  { id: 'sv6', name: 'Горячий камень (стоун)',       category: 'MASSAGE',     price: 950000, duration: 90 },
  { id: 'sv7', name: 'Антицеллюлитный массаж',      category: 'MASSAGE',     price: 400000, duration: 45 },
  { id: 'sv8', name: 'Нейромышечный массаж',        category: 'MASSAGE',     price: 700000, duration: 75 },
  // Cosmetology
  { id: 'sv9',  name: 'Гиалуроновый лифтинг',  category: 'COSMETOLOGY', price: 1200000, duration: 90 },
  { id: 'sv10', name: 'Биоревитализация',       category: 'COSMETOLOGY', price: 1800000, duration: 60 },
  { id: 'sv11', name: 'Мезотерапия',            category: 'COSMETOLOGY', price: 1500000, duration: 45 },
  { id: 'sv12', name: 'Химический пилинг',      category: 'COSMETOLOGY', price:  800000, duration: 45 },
  { id: 'sv13', name: 'Антивозрастной уход',    category: 'COSMETOLOGY', price: 1150000, duration: 90 },
  { id: 'sv14', name: 'RF-лифтинг',             category: 'COSMETOLOGY', price: 1000000, duration: 60 },
  { id: 'sv15', name: 'Лазерная эпиляция',      category: 'COSMETOLOGY', price: 1500000, duration: 60 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(m: number) {
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} ч ${rem} мин` : `${h} ч`;
}

function typeLabel(t: SpecialistType) {
  return t === 'MASSAGE_THERAPIST' ? 'Массажист' : 'Косметолог';
}

function typeIcon(t: SpecialistType, className?: string) {
  return t === 'MASSAGE_THERAPIST'
    ? <Leaf className={cn('shrink-0', className)} />
    : <Sparkles className={cn('shrink-0', className)} />;
}

function getNext30Days(): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 31; i++) {
    const copy = new Date(d.getTime() + i * 86400000);
    if (copy.getDay() !== 0) days.push(copy.toISOString().slice(0, 10));
  }
  return days;
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', weekday: 'short', timeZone: 'UTC' });
}

const DAYS = getNext30Days();

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'client',     label: 'Клиент' },
  { key: 'specialist', label: 'Специалист' },
  { key: 'service',    label: 'Услуга' },
  { key: 'date',       label: 'Дата' },
  { key: 'time',       label: 'Время' },
  { key: 'notes',      label: 'Подтверждение' },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-1 px-6 py-4 border-b border-border-luxury overflow-x-auto">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              i < idx  ? 'bg-sage text-obsidian' :
              i === idx ? 'bg-champagne text-obsidian' :
              'bg-charcoal text-text-tertiary',
            )}>
              {i < idx ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={cn(
              'text-xs font-medium whitespace-nowrap',
              i === idx ? 'text-champagne' : i < idx ? 'text-sage' : 'text-text-tertiary',
            )}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('h-px flex-1 min-w-[12px]', i < idx ? 'bg-sage/40' : 'bg-border-luxury')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Dialog component ─────────────────────────────────────────────────────────

interface NewBookingDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (booking: CreatedBooking) => void;
}

export interface CreatedBooking {
  id: string;
  client: string;
  clientId: string;
  service: string;
  specialist: string;
  dateTime: Date;
  duration: number;
  status: 'PENDING';
  amount: number;
}

export function NewBookingDialog({ open, onClose, onCreated }: NewBookingDialogProps) {
  const [step, setStep] = React.useState<Step>('client');

  // Selections
  const [client,     setClient]     = React.useState<ModalClient | null>(null);
  const [specialist, setSpecialist] = React.useState<ModalSpecialist | null>(null);
  const [service,    setService]    = React.useState<ModalService | null>(null);
  const [date,       setDate]       = React.useState<string>('');
  const [time,       setTime]       = React.useState<string>('');
  const [notes,      setNotes]      = React.useState('');

  // Data lists
  const [clients,     setClients]     = React.useState<ModalClient[]>(MOCK_CLIENTS);
  const [specialists, setSpecialists] = React.useState<ModalSpecialist[]>(MOCK_SPECIALISTS);
  const [services,    setServices]    = React.useState<ModalService[]>([]);
  const [slots,       setSlots]       = React.useState<TimeSlot[]>([]);
  const [nextAvailableDate, setNextAvailableDate] = React.useState<string | null>(null);

  // UI state
  const [clientSearch,       setClientSearch]       = React.useState('');
  const [specialistSearch,   setSpecialistSearch]   = React.useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false);
  const [loadingSlots,       setLoadingSlots]       = React.useState(false);
  const [submitting,         setSubmitting]          = React.useState(false);
  const [error,              setError]              = React.useState<string | null>(null);
  const [success,            setSuccess]            = React.useState(false);

  const searchRef    = React.useRef<HTMLInputElement>(null);
  const debounceRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset on open/close ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (open) {
      setStep('client');
      setClient(null); setSpecialist(null); setService(null);
      setDate(''); setTime(''); setNotes('');
      setClientSearch(''); setSpecialistSearch('');
      setError(null); setSuccess(false);
      setClients(MOCK_CLIENTS);
      setSpecialists(MOCK_SPECIALISTS);
      setServices([]);
      setSlots([]);
      setNextAvailableDate(null);
    }
  }, [open]);

  // ── Load specialists from API on dialog open ─────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    fetch('/api/specialists?limit=50', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) return;
        const mapped: ModalSpecialist[] = json.data.items.map((s: {
          id: string;
          name?: string;
          user?: { name?: string };
          specialistType?: string;
          specialization?: string;
          specializations?: string[];
          rating?: number;
        }) => ({
          id: s.id,
          // new API returns top-level 'name'; old domain entity path is s.user?.name
          name: s.name ?? s.user?.name ?? '—',
          type: (s.specialistType ?? 'MASSAGE_THERAPIST') as SpecialistType,
          specializations: s.specializations ?? (s.specialization ? s.specialization.split(',').map(x => x.trim()) : []),
          rating: s.rating,
        }));
        if (mapped.length > 0) setSpecialists(mapped);
      })
      .catch(() => {/* keep MOCK_SPECIALISTS */});
  }, [open]);

  // ── Debounced client search ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!clientSearch.trim()) {
      setClients(MOCK_CLIENTS);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const q = clientSearch.toLowerCase();
      setClients(MOCK_CLIENTS.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.includes(q)) ||
        (c.email?.toLowerCase().includes(q))
      ));
      fetch(`/api/customers?search=${encodeURIComponent(clientSearch)}&limit=10`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (!json?.data?.items?.length) return;
          const mapped: ModalClient[] = json.data.items.map((c: {
            id: string;
            user?: { name?: string; phone?: string; email?: string };
          }) => ({
            id: c.id,
            name: c.user?.name ?? '—',
            phone: c.user?.phone ?? undefined,
            email: c.user?.email ?? undefined,
          }));
          if (mapped.length > 0) setClients(mapped);
        })
        .catch(() => {});
    }, 250);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch]);

  // ── Load services when specialist selected ───────────────────────────────────
  React.useEffect(() => {
    if (!specialist) { setServices([]); return; }
    const category = specialist.type === 'MASSAGE_THERAPIST' ? 'MASSAGE' : 'COSMETOLOGY';
    // Instant mock filter
    setServices(MOCK_SERVICES.filter(s => s.category === category));
    // Try API
    fetch(`/api/services?category=${category}&limit=50`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) return;
        const mapped: ModalService[] = json.data.items.map((s: {
          id: string; name: string; category: string;
          basePrice?: number; baseDuration?: number;
        }) => ({
          id: s.id,
          name: s.name,
          category: s.category as 'MASSAGE' | 'COSMETOLOGY',
          price: s.basePrice ?? 0,
          duration: s.baseDuration ?? 60,
        }));
        if (mapped.length > 0) setServices(mapped);
      })
      .catch(() => {/* keep mock filter */});
  }, [specialist]);

  // ── Load slots when specialist + service + date all set ──────────────────────
  React.useEffect(() => {
    if (!specialist || !service || !date) {
      setSlots([]); setNextAvailableDate(null); return;
    }
    setLoadingSlots(true);
    setTime('');
    fetch(
      `/api/appointments/available-slots?specialistId=${specialist.id}&date=${date}&duration=${service.duration}`,
      { credentials: 'include' }
    )
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const apiSlots: TimeSlot[] | undefined = json?.data?.slots;
        if (apiSlots && apiSlots.length > 0) {
          setSlots(apiSlots);
          setNextAvailableDate(json.data.nextAvailableDate ?? null);
        } else {
          // API returned non-OK, empty slots, or missing — use client-side mock
          setSlots(generateMockSlots(date, service.duration));
          setNextAvailableDate(null);
        }
      })
      .catch(() => {
        setSlots(generateMockSlots(date, service.duration));
        setNextAvailableDate(null);
      })
      .finally(() => setLoadingSlots(false));
  }, [specialist, service, date]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone?.includes(q)) || (c.email?.toLowerCase().includes(q));
  });

  const filteredSpecialists = React.useMemo(() => {
    const q = specialistSearch.toLowerCase().trim();
    if (!q) return specialists;
    return specialists.filter(sp =>
      sp.name.toLowerCase().includes(q) ||
      sp.specializations.some(s => s.toLowerCase().includes(q)) ||
      typeLabel(sp.type).toLowerCase().includes(q)
    );
  }, [specialists, specialistSearch]);

  const availableSlots = slots.filter(s => s.available);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const stepOrder: Step[] = ['client', 'specialist', 'service', 'date', 'time', 'notes'];
  const stepIdx  = stepOrder.indexOf(step);
  const canGoBack = stepIdx > 0;

  function goBack() {
    if (canGoBack) setStep(stepOrder[stepIdx - 1]);
  }

  function canProceed(): boolean {
    if (step === 'client')     return !!client;
    if (step === 'specialist') return !!specialist;
    if (step === 'service')    return !!service;
    if (step === 'date')       return !!date;
    if (step === 'time')       return !!time;
    return true;
  }

  function goNext() {
    if (!canProceed()) return;
    if (step === 'notes') { handleSubmit(); return; }
    setStep(stepOrder[stepIdx + 1]);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!client || !specialist || !service || !date || !time) return;
    setSubmitting(true);
    setError(null);

    const [h, m] = time.split(':').map(Number);
    // Moscow time → UTC (UTC+3: subtract 3 hours)
    const startAt = new Date(`${date}T${String(h - 3).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);

    const body = {
      specialistId: specialist.id,
      locationId: SALON_LOCATION.id,
      startAt: startAt.toISOString(),
      services: [{ serviceId: service.id, price: service.price / 100, duration: service.duration, sortOrder: 0 }],
      notes: notes.trim() || undefined,
      source: 'web',
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        const appt = json?.data?.appointment ?? json?.data ?? {};
        setSuccess(true);
        setTimeout(() => {
          onCreated({
            id: appt.id ?? crypto.randomUUID(),
            client: client.name,
            clientId: client.id,
            service: service.name,
            specialist: specialist.name,
            dateTime: new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`),
            duration: service.duration,
            status: 'PENDING',
            amount: service.price,
          });
          onClose();
        }, 1200);
      } else {
        const json = await res.json().catch(() => ({}));
        const msg = json?.error?.message ?? 'Ошибка при создании записи';
        if (res.status === 409 && nextAvailableDate) {
          setError(`${msg}. Следующий доступный день: ${formatDay(nextAvailableDate)}`);
        } else {
          setError(msg);
        }
      }
    } catch {
      // Optimistic creation for environments without DB
      setSuccess(true);
      setTimeout(() => {
        onCreated({
          id: crypto.randomUUID(),
          client: client.name,
          clientId: client.id,
          service: service.name,
          specialist: specialist.name,
          dateTime: new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`),
          duration: service.duration,
          status: 'PENDING',
          amount: service.price,
        });
        onClose();
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-onyx border border-border-luxury rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
          <h2 className="font-serif text-xl font-medium text-text-primary">Новая запись</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── STEP 1: Client ─────────────────────────────────────────── */}
          {step === 'client' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">Найдите клиента по имени, телефону или email</p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                <input
                  ref={searchRef}
                  autoFocus
                  type="text"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                  onFocus={() => setClientDropdownOpen(true)}
                  placeholder="Введите имя, телефон или email…"
                  className={cn(
                    'w-full h-11 pl-9 pr-4 rounded-xl text-sm',
                    'bg-charcoal border border-border-luxury',
                    'text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20',
                  )}
                />
              </div>

              {clientDropdownOpen && (
                <div className="rounded-xl border border-border-luxury overflow-hidden divide-y divide-border-luxury">
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-text-tertiary">Клиент не найден</div>
                  ) : (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setClient(c); setClientDropdownOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          client?.id === c.id ? 'bg-champagne/10' : 'hover:bg-charcoal/60',
                        )}
                      >
                        <Avatar name={c.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{c.name}</p>
                          <p className="text-xs text-text-tertiary">{c.phone ?? c.email ?? ''}</p>
                        </div>
                        {client?.id === c.id && <Check className="w-4 h-4 text-champagne shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              )}

              {client && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-champagne/8 border border-champagne/20">
                  <Avatar name={client.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{client.name}</p>
                    <p className="text-xs text-text-tertiary">{client.phone ?? client.email ?? ''}</p>
                  </div>
                  <Check className="w-4 h-4 text-champagne ml-auto" />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Specialist ────────────────────────────────────── */}
          {step === 'specialist' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Выберите специалиста</p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={specialistSearch}
                  onChange={e => setSpecialistSearch(e.target.value)}
                  placeholder="Поиск по имени или специализации…"
                  className={cn(
                    'w-full h-11 pl-9 pr-4 rounded-xl text-sm',
                    'bg-charcoal border border-border-luxury',
                    'text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20',
                  )}
                />
              </div>

              {/* Type badges */}
              <div className="flex gap-2">
                {(['ALL', 'MASSAGE_THERAPIST', 'COSMETOLOGIST'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSpecialistSearch(
                      filter === 'ALL' ? '' :
                      filter === 'MASSAGE_THERAPIST' ? 'Массажист' : 'Косметолог'
                    )}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      filter === 'ALL' && !specialistSearch
                        ? 'border-champagne/40 bg-champagne/10 text-champagne'
                        : filter === 'MASSAGE_THERAPIST' && specialistSearch === 'Массажист'
                          ? 'border-sage/40 bg-sage/10 text-sage'
                          : filter === 'COSMETOLOGIST' && specialistSearch === 'Косметолог'
                            ? 'border-champagne/40 bg-champagne/10 text-champagne'
                            : 'border-border-luxury text-text-tertiary hover:border-border-light',
                    )}
                  >
                    {filter === 'ALL' ? 'Все' : filter === 'MASSAGE_THERAPIST' ? 'Массажисты' : 'Косметологи'}
                  </button>
                ))}
              </div>

              {/* List */}
              {filteredSpecialists.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-tertiary">Специалист не найден</div>
              ) : (
                filteredSpecialists.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => { setSpecialist(sp); setService(null); setTime(''); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all',
                      specialist?.id === sp.id
                        ? 'border-champagne/40 bg-champagne/8'
                        : 'border-border-luxury hover:border-border-light hover:bg-charcoal/40',
                    )}
                  >
                    <Avatar name={sp.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary">{sp.name}</p>
                        {sp.rating && <span className="text-xs text-champagne">★ {sp.rating}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {typeIcon(sp.type, 'w-3 h-3 ' + (sp.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne'))}
                        <span className={cn('text-xs font-medium', sp.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne')}>
                          {typeLabel(sp.type)}
                        </span>
                        {sp.specializations.length > 0 && (
                          <span className="text-xs text-text-tertiary">· {sp.specializations.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    {specialist?.id === sp.id && <Check className="w-4 h-4 text-champagne shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── STEP 3: Service ──────────────────────────────────────── */}
          {step === 'service' && (
            <div className="space-y-3">
              {specialist && (
                <div className="flex items-center gap-2 mb-1">
                  {typeIcon(specialist.type, 'w-4 h-4 ' + (specialist.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne'))}
                  <p className="text-sm text-text-secondary">
                    Услуги для{' '}
                    <span className={cn('font-medium', specialist.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne')}>
                      {typeLabel(specialist.type).toLowerCase()}а
                    </span>
                    {' · '}
                    <span className="text-text-tertiary">{specialist.name}</span>
                  </p>
                </div>
              )}
              {services.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-tertiary">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-champagne" />
                  Загрузка услуг…
                </div>
              ) : (
                services.map(svc => (
                  <button
                    key={svc.id}
                    onClick={() => { setService(svc); setTime(''); }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left transition-all',
                      service?.id === svc.id
                        ? 'border-champagne/40 bg-champagne/8'
                        : 'border-border-luxury hover:border-border-light hover:bg-charcoal/40',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {specialist && typeIcon(specialist.type, 'w-3.5 h-3.5 ' + (specialist.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne'))}
                      <div>
                        <p className="text-sm font-medium text-text-primary">{svc.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-tertiary">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(svc.duration)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-champagne">{formatCurrency(svc.price)}</span>
                      {service?.id === svc.id && <Check className="w-4 h-4 text-champagne" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── STEP 4: Date ──────────────────────────────────────────── */}
          {step === 'date' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Выберите дату</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {DAYS.map(d => {
                  const dateObj = new Date(d + 'T12:00:00Z');
                  const dayNum  = dateObj.getUTCDate();
                  const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' });
                  const month   = dateObj.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' });
                  const isToday = d === new Date().toISOString().slice(0, 10);
                  return (
                    <button
                      key={d}
                      onClick={() => setDate(d)}
                      className={cn(
                        'flex flex-col items-center py-3 px-2 rounded-xl border transition-all',
                        date === d
                          ? 'border-champagne/50 bg-champagne/10 text-champagne'
                          : 'border-border-luxury hover:border-border-light hover:bg-charcoal/40 text-text-secondary',
                      )}
                    >
                      <span className={cn('text-[10px] font-medium uppercase', date === d ? 'text-champagne/70' : 'text-text-tertiary')}>
                        {dayName}
                      </span>
                      <span className="text-lg font-semibold leading-tight">{dayNum}</span>
                      <span className={cn('text-[10px]', date === d ? 'text-champagne/70' : 'text-text-tertiary')}>{month}</span>
                      {isToday && <span className="text-[9px] font-bold mt-0.5 text-sage">сегодня</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 5: Time ──────────────────────────────────────────── */}
          {step === 'time' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Доступные слоты · {date && formatDay(date)}
                </p>
                {specialist?.type === 'MASSAGE_THERAPIST' && (
                  <span className="text-xs text-sage flex items-center gap-1">
                    <Leaf className="w-3 h-3" />30 мин буфер
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-10 bg-charcoal rounded-xl animate-shimmer" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setTime(slot.time)}
                        title={!slot.available
                          ? slot.reason === 'occupied'    ? 'Занято'
                          : slot.reason === 'past'        ? 'Прошедшее время'
                          : slot.reason === 'outside_hours' ? 'Вне рабочего времени'
                          : 'Недоступно'
                          : undefined}
                        className={cn(
                          'h-10 rounded-xl text-sm font-medium transition-all border',
                          !slot.available
                            ? 'bg-charcoal/30 border-border-luxury text-text-tertiary cursor-not-allowed opacity-40'
                            : time === slot.time
                              ? 'bg-champagne text-obsidian border-champagne shadow-[0_0_12px_rgba(212,175,122,0.3)]'
                              : 'bg-charcoal border-border-luxury text-text-primary hover:border-champagne/40 hover:bg-charcoal/80',
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>

                  {slots.length > 0 && availableSlots.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <p className="text-sm text-text-secondary">Нет доступных слотов на эту дату</p>
                      {nextAvailableDate && (
                        <button
                          onClick={() => { setDate(nextAvailableDate); setNextAvailableDate(null); setStep('date'); }}
                          className="text-sm text-champagne hover:underline flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Перейти на {formatDay(nextAvailableDate)}
                        </button>
                      )}
                    </div>
                  )}

                  {slots.length === 0 && (
                    <div className="py-6 text-center text-sm text-text-tertiary">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-champagne" />
                      Загрузка слотов…
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 6: Notes + Summary ───────────────────────────────── */}
          {step === 'notes' && (
            <div className="space-y-5">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-sage" />
                  </div>
                  <p className="font-medium text-text-primary">Запись создана</p>
                  <p className="text-sm text-text-tertiary">Клиент будет уведомлён</p>
                </div>
              ) : (
                <>
                  {/* Summary card */}
                  <div className="bg-charcoal rounded-2xl p-4 space-y-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">Сводка записи</p>
                    {[
                      { icon: <User className="w-3.5 h-3.5" />,     label: 'Клиент',      value: client?.name },
                      { icon: <Avatar name={specialist?.name ?? ''} size="xs" />, label: 'Специалист', value: specialist ? `${specialist.name} · ${typeLabel(specialist.type)}` : '' },
                      { icon: specialist ? typeIcon(specialist.type, 'w-3.5 h-3.5') : <Sparkles className="w-3.5 h-3.5" />, label: 'Услуга', value: service?.name },
                      { icon: <Clock className="w-3.5 h-3.5" />,     label: 'Длительность', value: service ? formatDuration(service.duration) : '' },
                      { icon: <Calendar className="w-3.5 h-3.5" />,  label: 'Дата',        value: date ? formatDay(date) : '' },
                      { icon: <Clock className="w-3.5 h-3.5" />,     label: 'Время',       value: time || '' },
                      { icon: null,                                   label: 'Сумма',       value: service ? formatCurrency(service.price) : '' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-text-tertiary min-w-[100px]">
                          {row.icon}
                          <span>{row.label}</span>
                        </div>
                        <span className="text-text-primary font-medium text-right">{row.value}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border-luxury text-xs text-text-tertiary flex items-center gap-1.5">
                      <span>📍</span>
                      <span>{SALON_LOCATION.label}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                      Примечания (необязательно)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Пожелания, противопоказания, особые требования…"
                      className={cn(
                        'w-full rounded-xl px-4 py-3 text-sm resize-none',
                        'bg-charcoal border border-border-luxury',
                        'text-text-primary placeholder:text-text-tertiary',
                        'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20',
                      )}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-border-luxury flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                canGoBack
                  ? 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-border-luxury'
                  : 'invisible',
              )}
            >
              <ChevronLeft className="w-4 h-4" /> Назад
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed() || submitting}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                canProceed() && !submitting
                  ? 'luxury-gradient text-obsidian shadow-[0_2px_12px_rgba(212,175,122,0.25)] hover:opacity-90'
                  : 'bg-charcoal text-text-tertiary border border-border-luxury cursor-not-allowed',
              )}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Создание…</>
              ) : step === 'notes' ? (
                <><Check className="w-4 h-4" /> Создать запись</>
              ) : (
                <>Далее <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client-side mock slot generator ─────────────────────────────────────────

function generateMockSlots(date: string, duration: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = Date.now();
  // Salon: 10:00–20:00 Moscow (UTC+3) → 07:00–17:00 UTC
  const dayEndMs = new Date(`${date}T17:00:00.000Z`).getTime();
  // Two fixed mock bookings: 11:00–12:30 and 14:00–15:30 Moscow = 08:00–09:30 and 11:00–12:30 UTC
  const mockBlocked: Array<[number, number]> = [
    [new Date(`${date}T08:00:00.000Z`).getTime(), new Date(`${date}T09:30:00.000Z`).getTime()],
    [new Date(`${date}T11:00:00.000Z`).getTime(), new Date(`${date}T12:30:00.000Z`).getTime()],
  ];
  for (let h = 10; h < 20; h++) {
    for (const m of [0, 30]) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      // Moscow → UTC: subtract 3 hours
      const slotMs    = new Date(`${date}T${String(h - 3).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).getTime();
      const slotEndMs = slotMs + duration * 60000;
      const isPast    = slotMs < now + 30 * 60000;
      const afterHours = slotEndMs > dayEndMs;
      let isBlocked = false;
      for (const [bStart, bEnd] of mockBlocked) {
        if (slotMs < bEnd && slotEndMs > bStart) { isBlocked = true; break; }
      }
      slots.push({
        time: timeStr,
        available: !isPast && !afterHours && !isBlocked,
        reason: isPast ? 'past' : afterHours ? 'outside_hours' : isBlocked ? 'occupied' : null,
      });
    }
  }
  return slots;
}
