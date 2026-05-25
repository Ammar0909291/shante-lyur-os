'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  baseDuration: number;
  imageUrl: string | null;
}

interface Specialist {
  id: string;
  displayName: string;
  specialization: string | null;
  bio: string | null;
}

interface SlotsResponse {
  slots: string[];
  locationId: string | null;
  locationName: string | null;
}

interface BookingResult {
  appointmentId: string;
  startAt: string;
  serviceName: string;
  specialistName: string;
}

interface ClientInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
}

// ─── Step Progress ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Услуга', num: 1 },
  { label: 'Специалист и время', num: 2 },
  { label: 'Ваши данные', num: 3 },
  { label: 'Подтверждение', num: 4 },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                currentStep === step.num
                  ? 'bg-champagne text-obsidian shadow-champagne'
                  : currentStep > step.num
                    ? 'bg-sage text-obsidian'
                    : 'bg-charcoal text-text-tertiary border border-border-luxury'
              )}
            >
              {currentStep > step.num ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-1 hidden sm:block',
                currentStep === step.num ? 'text-champagne' : 'text-text-tertiary'
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                'h-px w-8 sm:w-16 mx-1 mb-4 transition-all',
                currentStep > step.num ? 'bg-sage' : 'bg-border-luxury'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1 — Service Selection ───────────────────────────────────────────────

function Step1({
  services,
  loading,
  selectedId,
  onSelect,
}: {
  services: Service[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (s: Service) => void;
}) {
  const categoryLabels: Record<string, string> = {
    COSMETOLOGY: 'Косметология',
    MASSAGE: 'Массаж',
    INJECTION: 'Инъекции',
    LASER: 'Лазерные процедуры',
    BODY_CONTOURING: 'Контурная пластика',
    HAIR_REMOVAL: 'Депиляция',
    FACIAL: 'Уход за лицом',
    OTHER: 'Другое',
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-charcoal animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => onSelect(service)}
          className={cn(
            'text-left rounded-xl border p-5 transition-all hover:shadow-luxury',
            selectedId === service.id
              ? 'border-champagne bg-charcoal shadow-champagne-sm'
              : 'border-border-luxury bg-onyx hover:border-border-light'
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-text-primary leading-snug">{service.name}</h3>
            {selectedId === service.id && (
              <span className="shrink-0 w-5 h-5 rounded-full bg-champagne flex items-center justify-center">
                <svg className="w-3 h-3 text-obsidian" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary mb-3 line-clamp-2">
            {service.description ?? categoryLabels[service.category] ?? service.category}
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-champagne font-medium">{formatCurrency(service.basePrice)}</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-text-secondary">{service.baseDuration} мин</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Step 2 — Specialist, Date & Time ─────────────────────────────────────────

function Step2({
  specialists,
  loadingSpecialists,
  selectedSpecialistId,
  onSelectSpecialist,
  date,
  onDateChange,
  slots,
  loadingSlots,
  selectedSlot,
  onSelectSlot,
}: {
  specialists: Specialist[];
  loadingSpecialists: boolean;
  selectedSpecialistId: string | null;
  onSelectSpecialist: (id: string) => void;
  date: string;
  onDateChange: (d: string) => void;
  slots: SlotsResponse | null;
  loadingSlots: boolean;
  selectedSlot: string | null;
  onSelectSlot: (s: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Specialists */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">Специалист</h3>
        {loadingSpecialists ? (
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 w-40 rounded-xl bg-charcoal animate-shimmer" />
            ))}
          </div>
        ) : specialists.length === 0 ? (
          <p className="text-text-tertiary text-sm">Нет доступных специалистов</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialists.map((sp) => (
              <button
                key={sp.id}
                onClick={() => onSelectSpecialist(sp.id)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-all',
                  selectedSpecialistId === sp.id
                    ? 'border-champagne bg-charcoal shadow-champagne-sm'
                    : 'border-border-luxury bg-onyx hover:border-border-light'
                )}
              >
                <p className="font-medium text-text-primary">{sp.displayName}</p>
                {sp.specialization && (
                  <p className="text-xs text-text-tertiary mt-0.5">{sp.specialization}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Picker */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">Дата</h3>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={cn(
            'rounded-xl border border-border-luxury bg-onyx text-text-primary px-4 py-3',
            'focus:outline-none focus:border-champagne transition-colors',
            'w-full sm:w-auto'
          )}
        />
      </div>

      {/* Time Slots */}
      {selectedSpecialistId && date && (
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">Время</h3>
          {loadingSlots ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 w-20 rounded-lg bg-charcoal animate-shimmer" />
              ))}
            </div>
          ) : !slots || slots.slots.length === 0 ? (
            <p className="text-text-tertiary text-sm">Нет доступных слотов на выбранную дату</p>
          ) : (
            <>
              {slots.locationName && (
                <p className="text-xs text-text-tertiary mb-2">
                  Локация: <span className="text-text-secondary">{slots.locationName}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {slots.slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => onSelectSlot(slot)}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                      selectedSlot === slot
                        ? 'border-champagne bg-champagne text-obsidian'
                        : 'border-border-luxury bg-onyx text-text-primary hover:border-border-light'
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3 — Client Info ─────────────────────────────────────────────────────

function Step3({
  info,
  onChange,
}: {
  info: ClientInfo;
  onChange: (field: keyof ClientInfo, value: string) => void;
}) {
  const fields: Array<{
    key: keyof ClientInfo;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }> = [
    { key: 'firstName', label: 'Имя', type: 'text', required: true, placeholder: 'Введите имя' },
    { key: 'lastName', label: 'Фамилия', type: 'text', required: true, placeholder: 'Введите фамилию' },
    { key: 'phone', label: 'Телефон', type: 'tel', required: true, placeholder: '+7 (999) 000-00-00' },
    { key: 'email', label: 'E-mail (необязательно)', type: 'email', required: false, placeholder: 'your@email.com' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.key === 'phone' || f.key === 'email' ? 'sm:col-span-1' : ''}>
            <label className="block text-sm text-text-secondary mb-1.5">
              {f.label}
              {f.required && <span className="text-blush ml-1">*</span>}
            </label>
            <input
              type={f.type}
              value={info[f.key]}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={cn(
                'w-full rounded-xl border border-border-luxury bg-onyx text-text-primary px-4 py-3',
                'placeholder:text-text-tertiary focus:outline-none focus:border-champagne transition-colors'
              )}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">
          Примечания (необязательно)
        </label>
        <textarea
          value={info.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Особые пожелания или комментарии..."
          rows={3}
          className={cn(
            'w-full rounded-xl border border-border-luxury bg-onyx text-text-primary px-4 py-3',
            'placeholder:text-text-tertiary focus:outline-none focus:border-champagne transition-colors resize-none'
          )}
        />
      </div>
    </div>
  );
}

// ─── Step 4 — Confirm ─────────────────────────────────────────────────────────

function Step4({
  service,
  specialist,
  date,
  time,
  clientInfo,
  onConfirm,
  submitting,
}: {
  service: Service;
  specialist: Specialist;
  date: string;
  time: string;
  clientInfo: ClientInfo;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rows = [
    { label: 'Услуга', value: service.name },
    { label: 'Специалист', value: specialist.displayName },
    { label: 'Дата и время', value: `${formattedDate}, ${time}` },
    { label: 'Продолжительность', value: `${service.baseDuration} мин` },
    { label: 'Стоимость', value: formatCurrency(service.basePrice) },
    { label: 'Имя', value: `${clientInfo.firstName} ${clientInfo.lastName}` },
    { label: 'Телефон', value: clientInfo.phone },
  ];

  if (clientInfo.email) rows.push({ label: 'E-mail', value: clientInfo.email });
  if (clientInfo.notes) rows.push({ label: 'Примечания', value: clientInfo.notes });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-luxury bg-onyx overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              'flex items-start gap-4 px-5 py-3.5',
              i < rows.length - 1 ? 'border-b border-border-luxury' : ''
            )}
          >
            <span className="text-sm text-text-tertiary w-40 shrink-0">{row.label}</span>
            <span className="text-sm text-text-primary">{row.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={submitting}
        className={cn(
          'w-full rounded-xl py-4 font-semibold text-obsidian transition-all',
          'bg-champagne-gradient hover:shadow-champagne',
          submitting ? 'opacity-50 cursor-not-allowed' : ''
        )}
      >
        {submitting ? 'Отправляем...' : 'Подтвердить запись'}
      </button>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ result }: { result: BookingResult }) {
  const formattedDate = new Date(result.startAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = new Date(result.startAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-serif text-2xl text-text-primary mb-2">Запись подтверждена</h2>
      <p className="text-text-secondary mb-8">Ждём вас в нашем салоне</p>

      <div className="rounded-xl border border-border-luxury bg-onyx p-5 text-left space-y-3 mb-8">
        <div className="flex justify-between">
          <span className="text-text-tertiary text-sm">Услуга</span>
          <span className="text-text-primary text-sm">{result.serviceName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary text-sm">Специалист</span>
          <span className="text-text-primary text-sm">{result.specialistName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary text-sm">Дата и время</span>
          <span className="text-text-primary text-sm">{formattedDate}, {formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary text-sm">Номер записи</span>
          <span className="text-text-tertiary text-xs font-mono">{result.appointmentId.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <a
        href="/"
        className="inline-block rounded-xl border border-border-luxury text-text-secondary px-6 py-3 text-sm hover:border-border-light hover:text-text-primary transition-all"
      >
        На главную
      </a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookPage() {
  const [step, setStep] = useState(1);

  // Step 1
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Step 2
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slotsData, setSlotsData] = useState<SlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Step 3
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Step 4 / Result
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch services on mount
  useEffect(() => {
    fetch('/api/book/services')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setServices(json.data);
      })
      .finally(() => setLoadingServices(false));
  }, []);

  // Fetch specialists when service changes
  useEffect(() => {
    if (!selectedService) return;
    setLoadingSpecialists(true);
    setSelectedSpecialistId(null);
    setSlotsData(null);
    setSelectedSlot(null);
    fetch(`/api/book/specialists?serviceId=${selectedService.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSpecialists(json.data);
      })
      .finally(() => setLoadingSpecialists(false));
  }, [selectedService]);

  // Fetch slots when specialist + date changes
  const fetchSlots = useCallback(() => {
    if (!selectedSpecialistId || !selectedService || !date) return;
    setLoadingSlots(true);
    setSlotsData(null);
    setSelectedSlot(null);
    fetch(
      `/api/book/slots?specialistId=${selectedSpecialistId}&serviceId=${selectedService.id}&date=${date}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSlotsData(json.data);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedSpecialistId, selectedService, date]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleClientInfoChange = (field: keyof ClientInfo, value: string) => {
    setClientInfo((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    if (step === 1) return selectedService !== null;
    if (step === 2)
      return selectedSpecialistId !== null && date !== '' && selectedSlot !== null;
    if (step === 3)
      return (
        clientInfo.firstName.trim() !== '' &&
        clientInfo.lastName.trim() !== '' &&
        clientInfo.phone.trim() !== ''
      );
    return false;
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedSpecialistId || !date || !selectedSlot || !slotsData?.locationId)
      return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/book/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: clientInfo.firstName,
          lastName: clientInfo.lastName,
          phone: clientInfo.phone,
          email: clientInfo.email || undefined,
          serviceId: selectedService.id,
          specialistId: selectedSpecialistId,
          date,
          time: selectedSlot,
          locationId: slotsData.locationId,
          notes: clientInfo.notes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBookingResult(json.data);
      } else {
        setErrorMsg(json.error?.message ?? 'Произошла ошибка при создании записи');
      }
    } catch {
      setErrorMsg('Произошла ошибка. Пожалуйста, попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSpecialist = specialists.find((s) => s.id === selectedSpecialistId) ?? null;

  if (bookingResult) {
    return (
      <div className="min-h-screen flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-text-primary">Shante Lyur</h1>
            <p className="text-text-tertiary text-sm mt-1">Premium Wellness Studio</p>
          </div>
          <div className="rounded-2xl border border-border-luxury bg-onyx p-6 sm:p-8 shadow-luxury-lg">
            <SuccessScreen result={bookingResult} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-text-primary">Shante Lyur</h1>
          <p className="text-text-tertiary text-sm mt-1">Premium Wellness Studio</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border-luxury bg-onyx p-6 sm:p-8 shadow-luxury-lg">
          <StepIndicator currentStep={step} />

          {/* Step title */}
          <div className="mb-6">
            <h2 className="font-serif text-xl text-text-primary">
              {step === 1 && 'Выберите услугу'}
              {step === 2 && 'Выберите специалиста и дату'}
              {step === 3 && 'Ваши данные'}
              {step === 4 && 'Подтверждение'}
            </h2>
          </div>

          {/* Step content */}
          {step === 1 && (
            <Step1
              services={services}
              loading={loadingServices}
              selectedId={selectedService?.id ?? null}
              onSelect={(s) => {
                setSelectedService(s);
              }}
            />
          )}

          {step === 2 && (
            <Step2
              specialists={specialists}
              loadingSpecialists={loadingSpecialists}
              selectedSpecialistId={selectedSpecialistId}
              onSelectSpecialist={(id) => {
                setSelectedSpecialistId(id);
                setSelectedSlot(null);
              }}
              date={date}
              onDateChange={(d) => {
                setDate(d);
                setSelectedSlot(null);
              }}
              slots={slotsData}
              loadingSlots={loadingSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          )}

          {step === 3 && (
            <Step3 info={clientInfo} onChange={handleClientInfoChange} />
          )}

          {step === 4 && selectedService && selectedSpecialist && selectedSlot && (
            <Step4
              service={selectedService}
              specialist={selectedSpecialist}
              date={date}
              time={selectedSlot}
              clientInfo={clientInfo}
              onConfirm={handleConfirm}
              submitting={submitting}
            />
          )}

          {/* Error */}
          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-luxury">
              <button
                onClick={() => {
                  setStep((s) => s - 1);
                  setErrorMsg(null);
                }}
                disabled={step === 1}
                className={cn(
                  'px-6 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  step === 1
                    ? 'border-border-luxury text-text-tertiary opacity-40 cursor-not-allowed'
                    : 'border-border-luxury text-text-secondary hover:border-border-light hover:text-text-primary'
                )}
              >
                Назад
              </button>

              <button
                onClick={() => {
                  setStep((s) => s + 1);
                  setErrorMsg(null);
                }}
                disabled={!canProceed()}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  canProceed()
                    ? 'bg-champagne text-obsidian hover:shadow-champagne-sm'
                    : 'bg-charcoal text-text-tertiary cursor-not-allowed'
                )}
              >
                Далее
              </button>
            </div>
          )}

          {/* Back button on step 4 */}
          {step === 4 && !submitting && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setStep(3);
                  setErrorMsg(null);
                }}
                className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                ← Изменить данные
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
