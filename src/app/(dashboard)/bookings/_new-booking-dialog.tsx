'use client';

import * as React from 'react';
import {
  X, Search, ChevronRight, ChevronLeft, Check, Leaf, Sparkles,
  Clock, Calendar, User, AlertCircle, Loader2, CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { getClientRole } from '@/lib/client-auth';
import { useLanguage } from '@/contexts/language';

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
  department: string; // raw SpecialistDepartment from API
  specializations: string[];
  allowedServiceIds: string[];
  rating?: number;
}

interface ModalService {
  id: string;
  name: string;
  category: 'MASSAGE' | 'COSMETOLOGY';
  price: number; // kopecks — kept internally for booking body only
  duration: number; // minutes
}

interface TimeSlot {
  time: string;
  available: boolean;
  reason: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(m: number, minLabel: string, hourLabel: string) {
  if (m < 60) return `${m} ${minLabel}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} ${hourLabel} ${rem} ${minLabel}` : `${h} ${hourLabel}`;
}

function typeIcon(type: SpecialistType, className?: string) {
  return type === 'MASSAGE_THERAPIST'
    ? <Leaf className={cn('shrink-0', className)} />
    : <Sparkles className={cn('shrink-0', className)} />;
}

function formatDay(dateStr: string, locale: string) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', weekday: 'short', timeZone: 'UTC' });
}

// ─── Salon location placeholder ───────────────────────────────────────────────

const SALON_LOCATION_LABEL = 'Свердловская область, Екатеринбург, ул. Малышева, 3';
const SALON_LOCATION_FALLBACK_ID = '00000000-0000-0000-0000-000000000001';

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_CLIENTS: ModalClient[] = [
  { id: 'c1', name: 'Анна Михайлова',   phone: '+7 (912) 345-67-89' },
  { id: 'c2', name: 'Светлана Козлова', phone: '+7 (923) 456-78-90' },
  { id: 'c3', name: 'Ирина Белова',     phone: '+7 (934) 567-89-01' },
  { id: 'c4', name: 'Елена Морозова',   phone: '+7 (945) 678-90-12' },
  { id: 'c5', name: 'Татьяна Волкова',  phone: '+7 (956) 789-01-23' },
  { id: 'c6', name: 'Наталья Морозова', phone: '+7 (967) 890-12-34' },
  { id: 'c7', name: 'Ольга Захарова',   phone: '+7 (978) 901-23-45' },
  { id: 'c8', name: 'Юлия Мельникова',  phone: '+7 (989) 012-34-56' },
];

const MOCK_SPECIALISTS: ModalSpecialist[] = [
  { id: 's1', name: 'Наталья Владимирова', type: 'MASSAGE_THERAPIST', department: 'MASSAGE',     specializations: ['Тайский массаж', 'Ароматерапевтический'], allowedServiceIds: [], rating: 4.9 },
  { id: 's2', name: 'Ольга Козлова',       type: 'MASSAGE_THERAPIST', department: 'MASSAGE',     specializations: ['Спортивный', 'Нейромышечный'],            allowedServiceIds: [], rating: 4.8 },
  { id: 's3', name: 'Дарья Соколова',      type: 'MASSAGE_THERAPIST', department: 'MASSAGE',     specializations: ['Горячий камень', 'Антицеллюлитный'],      allowedServiceIds: [], rating: 4.7 },
  { id: 's4', name: 'Мария Волкова',       type: 'COSMETOLOGIST',     department: 'COSMETOLOGY', specializations: ['Биоревитализация', 'Гиалуроновый лифтинг'], allowedServiceIds: [], rating: 4.6 },
  { id: 's5', name: 'Ирина Соколова',      type: 'COSMETOLOGIST',     department: 'COSMETOLOGY', specializations: ['Химический пилинг', 'Аппаратная косметология'], allowedServiceIds: [], rating: 4.8 },
];


// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const { t } = useLanguage();
  const STEPS: Array<{ key: Step; label: string }> = [
    { key: 'client',     label: t('booking.step.client') },
    { key: 'specialist', label: t('booking.step.specialist') },
    { key: 'service',    label: t('booking.step.service') },
    { key: 'date',       label: t('booking.step.date') },
    { key: 'time',       label: t('booking.step.time') },
    { key: 'notes',      label: t('booking.step.summary') },
  ];
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

// ─── Month Calendar ───────────────────────────────────────────────────────────

interface MonthCalendarProps {
  selected: string;       // YYYY-MM-DD
  onSelect: (date: string) => void;
}

function MonthCalendar({ selected, onSelect }: MonthCalendarProps) {
  const { lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1))
      .replace(/^./, (c) => c.toUpperCase())
  );
  const DAY_NAMES_SHORT = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2000, 0, 3 + i))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = React.useState(() =>
    selected ? new Date(selected + 'T12:00:00Z').getUTCFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState(() =>
    selected ? new Date(selected + 'T12:00:00Z').getUTCMonth() : today.getMonth()
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // First day of month (0=Sun..6=Sat), convert to Mon-based (0=Mon..6=Sun)
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const offset   = (firstDay === 0 ? 6 : firstDay - 1); // Mon-based offset
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Max booking: 60 days out
  const maxDate = new Date(today.getTime() + 60 * 86400000);

  const cells: Array<number | null> = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isDisabled(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (d < today) return true;
    if (d > maxDate) return true;
    if (d.getDay() === 0) return true; // Sunday closed
    return false;
  }

  return (
    <div className="rounded-xl border border-border-luxury bg-charcoal overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-luxury">
        <button
          onClick={prevMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-onyx transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-text-primary">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-onyx transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border-luxury">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const ds       = dateStr(day);
          const disabled = isDisabled(day);
          const isToday  = ds === today.toISOString().slice(0, 10);
          const isSel    = ds === selected;
          return (
            <button
              key={ds}
              disabled={disabled}
              onClick={() => onSelect(ds)}
              className={cn(
                'h-8 w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center relative',
                disabled
                  ? 'text-text-tertiary/30 cursor-not-allowed'
                  : isSel
                    ? 'bg-champagne text-obsidian font-semibold shadow-[0_0_8px_rgba(212,175,122,0.4)]'
                    : isToday
                      ? 'border border-champagne/40 text-champagne hover:bg-champagne/10'
                      : 'text-text-primary hover:bg-onyx',
              )}
            >
              {day}
              {isToday && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-champagne/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dialog types ─────────────────────────────────────────────────────────────

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

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function NewBookingDialog({ open, onClose, onCreated }: NewBookingDialogProps) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const minLabel = t('common.min');
  const hourLabel = t('common.hours');
  const typeLabel = React.useCallback((type: SpecialistType) =>
    type === 'MASSAGE_THERAPIST' ? t('booking.massageType') : t('booking.cosmetologyType'), [t]);

  const [step, setStep] = React.useState<Step>('client');

  // Selections
  const [client,     setClient]     = React.useState<ModalClient | null>(null);
  const [specialist, setSpecialist] = React.useState<ModalSpecialist | null>(null);
  const [service,    setService]    = React.useState<ModalService | null>(null);
  const [date,       setDate]       = React.useState('');
  const [time,       setTime]       = React.useState('');
  const [notes,      setNotes]      = React.useState('');

  // Data lists
  const [clients,           setClients]           = React.useState<ModalClient[]>([]);
  const [specialists,       setSpecialists]       = React.useState<ModalSpecialist[]>([]);
  const [services,          setServices]          = React.useState<ModalService[]>([]);
  const [slots,             setSlots]             = React.useState<TimeSlot[]>([]);
  const [nextAvailableDate, setNextAvailableDate] = React.useState<string | null>(null);
  const [locationId,        setLocationId]        = React.useState(SALON_LOCATION_FALLBACK_ID);

  // Admin state
  const [userRole,       setUserRole]       = React.useState<string>('CLIENT');
  const [adminOverride,  setAdminOverride]  = React.useState(false);
  const [showOverrideDlg, setShowOverrideDlg] = React.useState(false);

  // UI state
  const [clientSearch,       setClientSearch]       = React.useState('');
  const [specialistSearch,   setSpecialistSearch]   = React.useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false);
  const [loadingSlots,       setLoadingSlots]       = React.useState(false);
  const [submitting,         setSubmitting]          = React.useState(false);
  const [error,              setError]              = React.useState<string | null>(null);
  const [success,            setSuccess]            = React.useState(false);

  const debounceRef    = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseClientsRef = React.useRef<ModalClient[]>(MOCK_CLIENTS);

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
  const isMassageSpecialist = specialist?.department === 'MASSAGE';

  // ── Reset on open ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    setStep('client');
    setClient(null); setSpecialist(null); setService(null);
    setDate(''); setTime(''); setNotes('');
    setClientSearch(''); setSpecialistSearch('');
    setError(null); setSuccess(false);
    setClients([]); setSpecialists([]);
    setServices([]); setSlots([]); setNextAvailableDate(null);
    setAdminOverride(false); setShowOverrideDlg(false);

    // Load recent real clients immediately so users don't pick mock placeholder data
    fetch('/api/clients/search?limit=20', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) { setClients(MOCK_CLIENTS); return; }
        const mapped: ModalClient[] = json.data.items.map((c: {
          id: string; firstName?: string; lastName?: string; phone?: string | null; email?: string | null;
        }) => ({ id: c.id, name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—', phone: c.phone ?? undefined, email: c.email ?? undefined }));
        baseClientsRef.current = mapped;
        setClients(mapped);
      })
      .catch(() => { baseClientsRef.current = MOCK_CLIENTS; setClients(MOCK_CLIENTS); });
  }, [open]);

  // ── Resolve location + user role on open ────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    fetch('/api/locations', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { const loc = json?.data?.items?.[0] ?? json?.data?.[0]; if (loc?.id) setLocationId(loc.id); })
      .catch(() => {});
    const cookieRole = getClientRole();
    if (cookieRole) { setUserRole(cookieRole); return; }
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data?.role) setUserRole(json.data.role); })
      .catch(() => {});
  }, [open]);

  // ── Load specialists from API ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    // Only load bookable departments (COSMETOLOGY, MASSAGE) — RECEPTION and MANAGEMENT cannot be booked
    fetch('/api/specialists?limit=100&status=ACTIVE', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) return;
        const mapped: ModalSpecialist[] = json.data.items
          .filter((s: { department?: string }) => {
            const dept = s.department ?? 'COSMETOLOGY';
            return dept !== 'RECEPTION' && dept !== 'MANAGEMENT';
          })
          .map((s: {
            id: string; firstName?: string; lastName?: string; name?: string;
            specialistType?: string; department?: string; specialization?: string;
            specializations?: string[]; allowedServiceIds?: string[]; rating?: number;
          }) => {
            const dept = s.department ?? 'COSMETOLOGY';
            const type: SpecialistType = dept === 'MASSAGE' ? 'MASSAGE_THERAPIST' : 'COSMETOLOGIST';
            return {
              id: s.id,
              name: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name ?? '—'),
              type,
              department: dept,
              specializations: s.specializations ?? (s.specialization ? s.specialization.split(',').map((x: string) => x.trim()) : []),
              allowedServiceIds: s.allowedServiceIds ?? [],
              rating: s.rating,
            };
          });
        if (mapped.length > 0) setSpecialists(mapped);
        else setSpecialists(MOCK_SPECIALISTS);
      })
      .catch(() => { setSpecialists(MOCK_SPECIALISTS); });
  }, [open]);

  // ── Debounced client search ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!clientSearch.trim()) { setClients(baseClientsRef.current); return; }
    debounceRef.current = setTimeout(() => {
      const q = clientSearch.toLowerCase();
      setClients(baseClientsRef.current.filter(c =>
        c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
      ));
      fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}&limit=10`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (!json?.data?.items?.length) return;
          const mapped: ModalClient[] = json.data.items.map((c: {
            id: string; firstName?: string; lastName?: string; phone?: string | null; email?: string | null;
          }) => ({ id: c.id, name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—', phone: c.phone ?? undefined, email: c.email ?? undefined }));
          if (mapped.length > 0) setClients(mapped);
        })
        .catch(() => {});
    }, 250);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch]);

  // ── Load services when specialist selected ───────────────────────────────────
  React.useEffect(() => {
    if (!specialist) { setServices([]); return; }
    const isMassageDept = specialist.department === 'MASSAGE';
    setServices([]); // show spinner until real services load

    fetch('/api/services?limit=200', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) {
          setServices([]);
          return;
        }
        let mapped: ModalService[] = json.data.items.map((s: {
          id: string; name: string; category: string; basePrice?: number; baseDuration?: number;
        }) => ({
          id: s.id,
          name: s.name,
          category: (['MASSAGE', 'BODY_CONTOURING'].includes(s.category) ? 'MASSAGE' : 'COSMETOLOGY') as 'MASSAGE' | 'COSMETOLOGY',
          price: s.basePrice ?? 0,
          duration: s.baseDuration ?? 60,
        }));
        mapped = mapped.filter(s => isMassageDept ? s.category === 'MASSAGE' : s.category === 'COSMETOLOGY');
        // Only filter by allowedServiceIds when it produces results — don't narrow to zero
        if (specialist.allowedServiceIds.length > 0) {
          const restricted = mapped.filter(s => specialist.allowedServiceIds.includes(s.id));
          if (restricted.length > 0) mapped = restricted;
        }
        setServices(mapped);
      })
      .catch(() => { setServices([]); });
  }, [specialist]);

  // ── Load slots when specialist + service + date set ──────────────────────────
  React.useEffect(() => {
    if (!specialist || !service || !date) { setSlots([]); setNextAvailableDate(null); return; }
    setLoadingSlots(true); setTime('');
    const params = new URLSearchParams({
      specialistId: specialist.id,
      date,
      duration: String(service.duration),
      ...(adminOverride ? { adminOverride: 'true' } : {}),
    });
    fetch(`/api/appointments/available-slots?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const apiSlots: TimeSlot[] | undefined = json?.data?.slots;
        if (apiSlots && apiSlots.length > 0) {
          setSlots(apiSlots);
          setNextAvailableDate(json.data.nextAvailableDate ?? null);
        } else {
          setSlots(generateMockSlots(date, service.duration));
          setNextAvailableDate(null);
        }
      })
      .catch(() => { setSlots(generateMockSlots(date, service.duration)); setNextAvailableDate(null); })
      .finally(() => setLoadingSlots(false));
  }, [specialist, service, date, adminOverride]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredClients = React.useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const filteredSpecialists = React.useMemo(() => {
    const q = specialistSearch.toLowerCase().trim();
    if (!q) return specialists;
    return specialists.filter(sp =>
      sp.name.toLowerCase().includes(q) ||
      sp.specializations.some(s => s.toLowerCase().includes(q)) ||
      typeLabel(sp.type).toLowerCase().includes(q)
    );
  }, [specialists, specialistSearch, typeLabel]);

  const availableSlots = slots.filter(s => s.available);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const stepOrder: Step[] = ['client', 'specialist', 'service', 'date', 'time', 'notes'];
  const stepIdx   = stepOrder.indexOf(step);
  const canGoBack = stepIdx > 0;

  function goBack() { if (canGoBack) setStep(stepOrder[stepIdx - 1]); }

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

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!client || !specialist || !service || !date || !time) return;
    setSubmitting(true); setError(null);

    const [h, m] = time.split(':').map(Number);
    // Yekaterinburg → UTC: subtract 5 hours
    const startAt = new Date(`${date}T${String(h - 5).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);

    const createdBooking: CreatedBooking = {
      id: crypto.randomUUID(),
      client: client.name,
      clientId: client.id,
      service: service.name,
      specialist: specialist.name,
      dateTime: new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`),
      duration: service.duration,
      status: 'PENDING',
      amount: service.price,
    };

    const body = {
      clientId: client.id,
      specialistId: specialist.id,
      locationId,
      startAt: startAt.toISOString(),
      services: [{ serviceId: service.id, price: service.price / 100, duration: service.duration, sortOrder: 0 }],
      notes: notes.trim() || undefined,
      source: 'admin',
      allowOverlap: adminOverride || undefined,
    };

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        const appt = json?.data ?? {};
        setSuccess(true);
        setTimeout(() => {
          onCreated({ ...createdBooking, id: appt.id ?? createdBooking.id });
          onClose();
        }, 1200);
      } else if (res.status === 409) {
        const msg = json?.error?.message ?? t('booking.busySlot');
        // If massage buffer violation and admin — offer override
        if (isMassageSpecialist && isAdmin && !adminOverride) {
          setShowOverrideDlg(true);
          setError(null);
        } else if (nextAvailableDate) {
          setError(`${msg}. ${t('booking.nearestAvailable')} ${formatDay(nextAvailableDate, locale)}`);
        } else {
          setError(msg);
        }
      } else {
        setError(json?.error?.message ?? t('booking.createError'));
      }
    } catch (err) {
      console.error('[booking] network error', err);
      setError(t('booking.networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm" />

      {/* Override confirmation modal */}
      {showOverrideDlg && (
        <div className="relative z-10 w-full max-w-sm bg-onyx border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text-primary text-sm">{t('booking.overrideTitle')}</p>
              <p className="text-xs text-text-tertiary mt-1">
                {t('booking.overrideDesc')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowOverrideDlg(false); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border-luxury text-text-secondary hover:bg-charcoal transition-colors"
            >
              {t('booking.keepBuffer')}
            </button>
            <button
              onClick={() => { setShowOverrideDlg(false); setAdminOverride(true); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              {t('booking.forceCreate')}
            </button>
          </div>
        </div>
      )}

      {/* Main dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-onyx border border-border-luxury rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
          <div>
            <h2 className="font-serif text-xl font-medium text-text-primary">{t('booking.title')}</h2>
            {isAdmin && (
              <p className="text-[11px] text-text-tertiary mt-0.5">{t('booking.adminCreation')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Admin buffer override — visible from step 3 onward when massage specialist selected */}
            {isAdmin && isMassageSpecialist && step !== 'client' && step !== 'specialist' && (
              <button
                onClick={() => setAdminOverride(v => !v)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  adminOverride
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border-border-luxury text-text-tertiary hover:border-amber-500/30 hover:text-amber-400')}
              >
                <ShieldAlert className="w-3 h-3" />
                {adminOverride ? t('booking.bufferDisabled') : t('booking.bypassBuffer')}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <StepBar current={step} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── STEP 1: Client ─────────────────────────────────────── */}
          {step === 'client' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">{t('booking.searchClientHint')}</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                  onFocus={() => setClientDropdownOpen(true)}
                  placeholder={t('booking.clientSearchPlaceholder')}
                  className={cn(
                    'w-full h-11 pl-9 pr-4 rounded-xl text-sm bg-charcoal border border-border-luxury',
                    'text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20',
                  )}
                />
              </div>
              {clientDropdownOpen && (
                <div className="rounded-xl border border-border-luxury overflow-hidden divide-y divide-border-luxury">
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-text-tertiary">{t('booking.clientNotFound')}</div>
                  ) : filteredClients.map(c => (
                    <button key={c.id} onClick={() => { setClient(c); setClientDropdownOpen(false); }}
                      className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        client?.id === c.id ? 'bg-champagne/10' : 'hover:bg-charcoal/60')}>
                      <Avatar name={c.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{c.name}</p>
                        <p className="text-xs text-text-tertiary">{c.phone ?? c.email ?? ''}</p>
                      </div>
                      {client?.id === c.id && <Check className="w-4 h-4 text-champagne shrink-0" />}
                    </button>
                  ))}
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

          {/* ── STEP 2: Specialist ────────────────────────────────── */}
          {step === 'specialist' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">{t('booking.searchSpecialistHint')}</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                <input autoFocus type="text" value={specialistSearch}
                  onChange={e => setSpecialistSearch(e.target.value)}
                  placeholder={t('booking.specialistSearchPlaceholder')}
                  className={cn('w-full h-11 pl-9 pr-4 rounded-xl text-sm bg-charcoal border border-border-luxury',
                    'text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20')} />
              </div>
              <div className="flex gap-2">
                {(['ALL','MASSAGE_THERAPIST','COSMETOLOGIST'] as const).map(f => (
                  <button key={f}
                    onClick={() => setSpecialistSearch(f === 'ALL' ? '' : f === 'MASSAGE_THERAPIST' ? t('booking.massageType') : t('booking.cosmetologyType'))}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      f === 'ALL' && !specialistSearch ? 'border-champagne/40 bg-champagne/10 text-champagne' :
                      f === 'MASSAGE_THERAPIST' && specialistSearch === t('booking.massageType') ? 'border-sage/40 bg-sage/10 text-sage' :
                      f === 'COSMETOLOGIST' && specialistSearch === t('booking.cosmetologyType') ? 'border-champagne/40 bg-champagne/10 text-champagne' :
                      'border-border-luxury text-text-tertiary hover:border-border-light')}>
                    {f === 'ALL' ? t('booking.filterAll') : f === 'MASSAGE_THERAPIST' ? t('booking.filterMassage') : t('booking.filterCosmetology')}
                  </button>
                ))}
              </div>
              {filteredSpecialists.length === 0
                ? <div className="py-8 text-center text-sm text-text-tertiary">{t('booking.specialistNotFound')}</div>
                : filteredSpecialists.map(sp => (
                  <button key={sp.id}
                    onClick={() => { setSpecialist(sp); setService(null); setTime(''); }}
                    className={cn('w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all',
                      specialist?.id === sp.id ? 'border-champagne/40 bg-champagne/8' : 'border-border-luxury hover:border-border-light hover:bg-charcoal/40')}>
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
              }
            </div>
          )}

          {/* ── STEP 3: Service ───────────────────────────────────── */}
          {step === 'service' && (
            <div className="space-y-3">
              {specialist && (
                <div className="flex items-center gap-2 mb-1">
                  {typeIcon(specialist.type, 'w-4 h-4 ' + (specialist.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne'))}
                  <p className="text-sm text-text-secondary">
                    {t('booking.servicesFor')}{' '}
                    <span className={cn('font-medium', specialist.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne')}>
                      {typeLabel(specialist.type).toLowerCase()}
                    </span>
                    {' · '}
                    <span className="text-text-tertiary">{specialist.name}</span>
                  </p>
                </div>
              )}
              {services.length === 0
                ? <div className="py-8 text-center text-sm text-text-tertiary">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-champagne" />
                    {t('booking.loadingServices')}
                  </div>
                : services.map(svc => (
                  <button key={svc.id} onClick={() => { setService(svc); setTime(''); }}
                    className={cn('w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all',
                      service?.id === svc.id ? 'border-champagne/40 bg-champagne/8' : 'border-border-luxury hover:border-border-light hover:bg-charcoal/40')}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: specialist?.type === 'MASSAGE_THERAPIST' ? 'rgba(107,162,109,0.15)' : 'rgba(212,175,122,0.15)' }}>
                      {specialist && typeIcon(specialist.type, 'w-4 h-4 ' + (specialist.type === 'MASSAGE_THERAPIST' ? 'text-sage' : 'text-champagne'))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{svc.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-tertiary">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(svc.duration, minLabel, hourLabel)}</span>
                      </div>
                    </div>
                    {service?.id === svc.id && <Check className="w-4 h-4 text-champagne shrink-0" />}
                  </button>
                ))
              }
            </div>
          )}

          {/* ── STEP 4: Date — month-view calendar ────────────────── */}
          {step === 'date' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">{t('booking.selectDateHint')}</p>
              <MonthCalendar selected={date} onSelect={d => setDate(d)} />
              {date && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-champagne/8 border border-champagne/20 text-sm">
                  <Calendar className="w-4 h-4 text-champagne" />
                  <span className="text-champagne font-medium">{formatDay(date, locale)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Time ──────────────────────────────────────── */}
          {step === 'time' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-text-secondary">
                  {t('booking.availableSlotsLabel')} · {date && formatDay(date, locale)}
                </p>
                <div className="flex items-center gap-2">
                  {isMassageSpecialist && !adminOverride && (
                    <span className="text-xs text-sage flex items-center gap-1">
                      <Leaf className="w-3 h-3" />{t('booking.bufferInfo')}
                    </span>
                  )}
                  {/* Admin override toggle — visible only to admins for massage specialists */}
                  {isAdmin && isMassageSpecialist && (
                    <button
                      onClick={() => setAdminOverride(v => !v)}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        adminOverride
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-border-luxury text-text-tertiary hover:border-amber-500/30 hover:text-amber-400')}
                    >
                      <ShieldAlert className="w-3 h-3" />
                      {adminOverride ? t('booking.bufferDisabled') : t('booking.disableBuffer')}
                    </button>
                  )}
                </div>
              </div>

              {adminOverride && isAdmin && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  {t('booking.adminMode')}
                </div>
              )}

              {loadingSlots ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-10 bg-charcoal rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot.time} disabled={!slot.available}
                        onClick={() => setTime(slot.time)}
                        title={!slot.available
                          ? slot.reason === 'occupied' ? t('booking.slotOccupied')
                          : slot.reason === 'past' ? t('booking.slotPast')
                          : t('booking.slotOutsideHours')
                          : undefined}
                        className={cn('h-10 rounded-xl text-sm font-medium transition-all border',
                          !slot.available
                            ? 'bg-charcoal/30 border-border-luxury text-text-tertiary cursor-not-allowed opacity-40'
                            : time === slot.time
                              ? 'bg-champagne text-obsidian border-champagne shadow-[0_0_12px_rgba(212,175,122,0.3)]'
                              : 'bg-charcoal border-border-luxury text-text-primary hover:border-champagne/40 hover:bg-charcoal/80')}>
                        {slot.time}
                      </button>
                    ))}
                  </div>

                  {slots.length > 0 && availableSlots.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <p className="text-sm text-text-secondary">{t('booking.noSlots')}</p>
                      {nextAvailableDate && (
                        <button onClick={() => { setDate(nextAvailableDate); setNextAvailableDate(null); setStep('date'); }}
                          className="text-sm text-champagne hover:underline flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {t('booking.goToDate')} {formatDay(nextAvailableDate, locale)}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 6: Confirmation ──────────────────────────────── */}
          {step === 'notes' && (
            <div className="space-y-5">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-sage" />
                  </div>
                  <p className="font-medium text-text-primary">{t('booking.success')}</p>
                  <p className="text-sm text-text-tertiary">{t('booking.notified')}</p>
                </div>
              ) : (
                <>
                  <div className="bg-charcoal rounded-2xl p-4 space-y-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">{t('booking.summaryLabel')}</p>
                    {[
                      { icon: <User className="w-3.5 h-3.5" />,    label: t('booking.fieldClient'),     value: client?.name },
                      { icon: specialist ? typeIcon(specialist.type, 'w-3.5 h-3.5') : null,
                                                                     label: t('booking.fieldSpecialist'), value: specialist ? `${specialist.name} · ${typeLabel(specialist.type)}` : '' },
                      { icon: <Sparkles className="w-3.5 h-3.5" />, label: t('booking.fieldService'),    value: service?.name },
                      { icon: <Clock className="w-3.5 h-3.5" />,    label: t('booking.fieldDuration'),   value: service ? formatDuration(service.duration, minLabel, hourLabel) : '' },
                      { icon: <Calendar className="w-3.5 h-3.5" />, label: t('booking.fieldDate'),       value: date ? formatDay(date, locale) : '' },
                      { icon: <Clock className="w-3.5 h-3.5" />,    label: t('booking.fieldTime'),       value: time || '' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-text-tertiary min-w-[110px]">
                          {row.icon}
                          <span>{row.label}</span>
                        </div>
                        <span className="text-text-primary font-medium text-right">{row.value}</span>
                      </div>
                    ))}
                    {adminOverride && isAdmin && (
                      <div className="pt-2 border-t border-border-luxury text-xs text-amber-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{t('booking.bufferAdminDisabled')}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border-luxury text-xs text-text-tertiary flex items-center gap-1.5">
                      <span>📍</span>
                      <span>{SALON_LOCATION_LABEL}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                      {t('booking.notesLabel')}
                    </label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      placeholder={t('booking.notesPlaceholder')}
                      className={cn('w-full rounded-xl px-4 py-3 text-sm resize-none',
                        'bg-charcoal border border-border-luxury',
                        'text-text-primary placeholder:text-text-tertiary',
                        'focus:outline-none focus:border-champagne/40 focus:ring-1 focus:ring-champagne/20')} />
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
            <button onClick={goBack} disabled={!canGoBack}
              className={cn('flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                canGoBack ? 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-border-luxury' : 'invisible')}>
              <ChevronLeft className="w-4 h-4" /> {t('common.back')}
            </button>
            <button onClick={goNext} disabled={!canProceed() || submitting}
              className={cn('flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                canProceed() && !submitting
                  ? 'luxury-gradient text-obsidian shadow-[0_2px_12px_rgba(212,175,122,0.25)] hover:opacity-90'
                  : 'bg-charcoal text-text-tertiary border border-border-luxury cursor-not-allowed')}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('booking.creating')}</>
                : step === 'notes' ? <><Check className="w-4 h-4" /> {t('booking.create')}</>
                : <>{t('common.next')} <ChevronRight className="w-4 h-4" /></>}
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
  const dayEndMs = new Date(`${date}T17:00:00.000Z`).getTime();
  const mockBlocked: Array<[number, number]> = [
    [new Date(`${date}T08:00:00.000Z`).getTime(), new Date(`${date}T09:30:00.000Z`).getTime()],
    [new Date(`${date}T11:00:00.000Z`).getTime(), new Date(`${date}T12:30:00.000Z`).getTime()],
  ];
  for (let h = 10; h < 20; h++) {
    for (const m of [0, 15, 30, 45]) {
      const timeStr   = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const slotMs    = new Date(`${date}T${String(h - 5).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).getTime();
      const slotEndMs = slotMs + duration * 60000;
      const isPast    = slotMs < now + 30 * 60000;
      const afterHrs  = slotEndMs > dayEndMs;
      let blocked = false;
      for (const [bs, be] of mockBlocked) { if (slotMs < be && slotEndMs > bs) { blocked = true; break; } }
      slots.push({
        time: timeStr,
        available: !isPast && !afterHrs && !blocked,
        reason: isPast ? 'past' : afterHrs ? 'outside_hours' : blocked ? 'occupied' : null,
      });
    }
  }
  return slots;
}
