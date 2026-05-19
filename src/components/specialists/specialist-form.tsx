'use client';

import * as React from 'react';
import { X, User, Briefcase, Palette, Grid, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-fetch';

// ── Localization constants ──────────────────────────────────────────────────
const LABELS = {
  createTitle: 'Новый специалист',
  editTitle: 'Редактировать специалиста',
  sectionAccount: 'Учётная запись',
  sectionProfile: 'Профиль специалиста',
  sectionCalendar: 'Параметры календаря',
  sectionServices: 'Услуги специалиста',
  sectionSchedule: 'Рабочий график',
  firstName: 'Имя',
  lastName: 'Фамилия',
  email: 'Email',
  password: 'Пароль',
  passwordHelper: 'Минимум 8 символов',
  phone: 'Телефон',
  phonePlaceholder: '+7 (999) 000-00-00',
  specialization: 'Специализация',
  specializationPlaceholder: 'Косметология, массаж...',
  bio: 'Биография',
  bioPlaceholder: 'Краткое описание специалиста...',
  experienceYears: 'Опыт (лет)',
  commissionRate: 'Ставка комиссии (%)',
  commissionHelper: 'От 0 до 100',
  calendarColor: 'Цвет в календаре',
  calendarColorHelper: 'Hex-код, например #6366f1',
  status: 'Статус',
  statusActive: 'Активен',
  statusInactive: 'Неактивен',
  statusVacation: 'В отпуске',
  statusTerminated: 'Уволен',
  btnCreate: 'Создать специалиста',
  btnSave: 'Сохранить изменения',
  btnCancel: 'Отмена',
  errorRequired: 'Обязательное поле',
  errorEmail: 'Некорректный email',
  errorPassword: 'Минимум 8 символов',
  errorColor: 'Формат: #RRGGBB',
  errorCommission: 'От 0 до 100',
  errorServer: 'Ошибка сервера. Попробуйте ещё раз.',
  creatingUser: 'Создание пользователя...',
  creatingProfile: 'Создание профиля...',
  saving: 'Сохранение...',
  servicesLoading: 'Загрузка услуг...',
  noServices: 'Услуги не найдены',
  scheduleLoading: 'Загрузка графика...',
  scheduleSave: 'Сохранить график',
  scheduleSaving: 'Сохранение графика...',
  scheduleSaved: 'График сохранён',
  scheduleValidFrom: 'Дата начала',
  scheduleHint: 'Выберите рабочие дни и укажите часы',
  scheduleBreak: 'Перерыв',
  days: {
    MONDAY: 'Понедельник',
    TUESDAY: 'Вторник',
    WEDNESDAY: 'Среда',
    THURSDAY: 'Четверг',
    FRIDAY: 'Пятница',
    SATURDAY: 'Суббота',
    SUNDAY: 'Воскресенье',
  } as Record<string, string>,
} as const;

const DAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpecialistRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  rating?: number | null;
  reviewCount: number;
  commissionRate: number;
  status: string;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
}

interface ScheduleDay {
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
}

type ScheduleState = Record<string, ScheduleDay>;

interface CreateFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  specialization: string;
  bio: string;
  experienceYears: string;
  commissionRate: string;
  color: string;
}

interface EditFormState {
  specialization: string;
  bio: string;
  experienceYears: string;
  commissionRate: string;
  color: string;
  status: string;
}

type FormErrors = Partial<Record<string, string>>;

interface SpecialistFormProps {
  mode: 'create' | 'edit';
  specialist?: SpecialistRecord;
  onSuccess: (specialist: SpecialistRecord) => void;
  onClose: () => void;
}

// ── Color swatch preview ─────────────────────────────────────────────────────

function ColorSwatch({ color }: { color: string }) {
  const isValid = /^#[A-Fa-f0-9]{6}$/.test(color);
  return (
    <span
      className="w-5 h-5 rounded border border-border-luxury shrink-0"
      style={{ backgroundColor: isValid ? color : 'transparent' }}
      aria-hidden="true"
    />
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-champagne shrink-0" aria-hidden="true" />
      <span className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        {label}
      </span>
    </div>
  );
}

// ── Select field ─────────────────────────────────────────────────────────────

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

function SelectField({ label, error, id, children, className, ...props }: SelectFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-xs font-semibold uppercase tracking-widest text-text-secondary"
      >
        {label}
      </label>
      <select
        id={fieldId}
        className={cn(
          'w-full h-11 rounded-lg px-4 text-sm',
          'bg-charcoal border border-border-luxury',
          'text-text-primary',
          'transition-all duration-200',
          'focus:outline-none focus:border-champagne focus:shadow-[0_0_0_3px_rgba(212,175,122,0.12)]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-red-500/60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Textarea field ────────────────────────────────────────────────────────────

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

function TextareaField({ label, error, id, className, ...props }: TextareaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-xs font-semibold uppercase tracking-widest text-text-secondary"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        className={cn(
          'w-full rounded-lg px-4 py-3 text-sm',
          'bg-charcoal border border-border-luxury',
          'text-text-primary placeholder:text-text-tertiary',
          'transition-all duration-200 resize-none',
          'focus:outline-none focus:border-champagne focus:shadow-[0_0_0_3px_rgba(212,175,122,0.12)]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-red-500/60',
          className,
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Time input ────────────────────────────────────────────────────────────────

function TimeInput({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'h-9 rounded-lg px-3 text-sm w-[110px]',
        'bg-charcoal border border-border-luxury text-text-primary',
        'focus:outline-none focus:border-champagne',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        '[color-scheme:dark]',
      )}
    />
  );
}

// ── Services section ─────────────────────────────────────────────────────────

function ServicesSection({ specialistId }: { specialistId: string }) {
  const [allServices, setAllServices] = React.useState<ServiceOption[]>([]);
  const [assignedIds, setAssignedIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null); // serviceId being toggled

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [svcRes, assignedRes] = await Promise.all([
          apiFetch('/api/services?limit=200'),
          apiFetch(`/api/admin/specialists/${specialistId}/services`),
        ]);
        const [svcJson, assignedJson] = await Promise.all([svcRes.json(), assignedRes.json()]);
        if (svcJson.success) {
          const items = (svcJson.data?.items ?? svcJson.data ?? []) as ServiceOption[];
          setAllServices(items);
        }
        if (assignedJson.success) {
          const ids = new Set<string>(
            (assignedJson.data?.items ?? []).map((s: { serviceId: string }) => s.serviceId)
          );
          setAssignedIds(ids);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [specialistId]);

  async function toggle(serviceId: string, currentlyAssigned: boolean) {
    setSaving(serviceId);
    try {
      if (currentlyAssigned) {
        const res = await apiFetch(`/api/admin/specialists/${specialistId}/services`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId }),
        });
        if (res.ok) {
          setAssignedIds(prev => { const s = new Set(prev); s.delete(serviceId); return s; });
        }
      } else {
        const res = await apiFetch(`/api/admin/specialists/${specialistId}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId }),
        });
        if (res.ok) {
          setAssignedIds(prev => new Set([...prev, serviceId]));
        }
      }
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <p className="text-xs text-text-tertiary">{LABELS.servicesLoading}</p>;
  }
  if (allServices.length === 0) {
    return <p className="text-xs text-text-tertiary">{LABELS.noServices}</p>;
  }

  return (
    <div className="space-y-2">
      {allServices.map(svc => {
        const assigned = assignedIds.has(svc.id);
        const busy = saving === svc.id;
        return (
          <label
            key={svc.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
              'border border-border-luxury',
              assigned ? 'bg-champagne/8 border-champagne/30' : 'bg-charcoal hover:bg-charcoal/70',
              busy && 'opacity-60 pointer-events-none',
            )}
          >
            <input
              type="checkbox"
              checked={assigned}
              onChange={() => toggle(svc.id, assigned)}
              disabled={busy}
              className="accent-[#D4AF7A] w-4 h-4 shrink-0"
            />
            <span className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary block truncate">{svc.name}</span>
              <span className="text-xs text-text-tertiary">{svc.category}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── Schedule section ──────────────────────────────────────────────────────────

function ScheduleSection({ specialistId }: { specialistId: string }) {
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [schedule, setSchedule] = React.useState<ScheduleState>(() =>
    Object.fromEntries(
      DAY_KEYS.map(d => [d, { enabled: false, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' }])
    )
  );
  const [validFrom, setValidFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState(false);

  // Load existing schedule and first available location
  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [schedRes, locRes] = await Promise.all([
          apiFetch(`/api/admin/specialists/${specialistId}/schedules`),
          apiFetch('/api/locations?limit=1'),
        ]);
        const [schedJson, locJson] = await Promise.all([schedRes.json(), locRes.json()]);

        if (locJson.success) {
          const locs = locJson.data?.items ?? locJson.data ?? [];
          if (locs.length > 0) setLocationId(locs[0].id);
        }

        if (schedJson.success) {
          const items = schedJson.data?.items ?? [];
          if (items.length > 0) {
            setValidFrom(items[0].validFrom?.slice(0, 10) ?? validFrom);
            const newSchedule: ScheduleState = { ...schedule };
            for (const item of items) {
              if (item.dayOfWeek in newSchedule) {
                newSchedule[item.dayOfWeek] = {
                  enabled: true,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  breakStart: item.breakStart ?? '13:00',
                  breakEnd: item.breakEnd ?? '14:00',
                };
              }
            }
            setSchedule(newSchedule);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialistId]);

  function updateDay(day: string, patch: Partial<ScheduleDay>) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function saveSchedule() {
    if (!locationId) return;
    const entries = DAY_KEYS.filter(d => schedule[d].enabled).map(d => ({
      dayOfWeek: d,
      startTime: schedule[d].startTime,
      endTime: schedule[d].endTime,
      breakStart: schedule[d].breakStart || undefined,
      breakEnd: schedule[d].breakEnd || undefined,
    }));

    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/specialists/${specialistId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          schedules: entries.length > 0 ? entries : [],
          validFrom,
        }),
      });
      if (res.ok) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-text-tertiary">{LABELS.scheduleLoading}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-tertiary">{LABELS.scheduleHint}</p>

      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary whitespace-nowrap">
          {LABELS.scheduleValidFrom}
        </label>
        <input
          type="date"
          value={validFrom}
          onChange={e => setValidFrom(e.target.value)}
          className={cn(
            'h-9 rounded-lg px-3 text-sm',
            'bg-charcoal border border-border-luxury text-text-primary',
            'focus:outline-none focus:border-champagne',
            '[color-scheme:dark]',
          )}
        />
      </div>

      <div className="space-y-2">
        {DAY_KEYS.map(day => {
          const d = schedule[day];
          return (
            <div
              key={day}
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 rounded-lg border transition-colors',
                d.enabled
                  ? 'border-champagne/30 bg-champagne/5'
                  : 'border-border-luxury bg-charcoal',
              )}
            >
              {/* Day toggle */}
              <label className="flex items-center gap-2 w-[130px] shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={e => updateDay(day, { enabled: e.target.checked })}
                  className="accent-[#D4AF7A] w-4 h-4"
                />
                <span className={cn('text-sm', d.enabled ? 'text-text-primary font-medium' : 'text-text-tertiary')}>
                  {LABELS.days[day]}
                </span>
              </label>

              {d.enabled && (
                <>
                  <TimeInput value={d.startTime} onChange={v => updateDay(day, { startTime: v })} />
                  <span className="text-text-tertiary text-sm">—</span>
                  <TimeInput value={d.endTime} onChange={v => updateDay(day, { endTime: v })} />
                  <span className="text-xs text-text-tertiary ml-1">{LABELS.scheduleBreak}:</span>
                  <TimeInput value={d.breakStart} onChange={v => updateDay(day, { breakStart: v })} />
                  <span className="text-text-tertiary text-sm">—</span>
                  <TimeInput value={d.breakEnd} onChange={v => updateDay(day, { breakEnd: v })} />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          isLoading={saving}
          onClick={saveSchedule}
          disabled={!locationId}
        >
          {LABELS.scheduleSave}
        </Button>
        {savedMsg && (
          <span className="text-xs text-green-400">{LABELS.scheduleSaved}</span>
        )}
        {!locationId && (
          <span className="text-xs text-text-tertiary">Нет локаций в системе</span>
        )}
      </div>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateCreate(s: CreateFormState): FormErrors {
  const errors: FormErrors = {};
  if (!s.firstName.trim()) errors.firstName = LABELS.errorRequired;
  if (!s.lastName.trim()) errors.lastName = LABELS.errorRequired;
  if (!s.email.trim()) errors.email = LABELS.errorRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errors.email = LABELS.errorEmail;
  if (!s.password) errors.password = LABELS.errorRequired;
  else if (s.password.length < 8) errors.password = LABELS.errorPassword;
  if (s.color && !/^#[A-Fa-f0-9]{6}$/.test(s.color)) errors.color = LABELS.errorColor;
  const comm = parseFloat(s.commissionRate);
  if (isNaN(comm) || comm < 0 || comm > 100) errors.commissionRate = LABELS.errorCommission;
  return errors;
}

function validateEdit(s: EditFormState): FormErrors {
  const errors: FormErrors = {};
  if (s.color && !/^#[A-Fa-f0-9]{6}$/.test(s.color)) errors.color = LABELS.errorColor;
  const comm = parseFloat(s.commissionRate);
  if (isNaN(comm) || comm < 0 || comm > 100) errors.commissionRate = LABELS.errorCommission;
  return errors;
}

// ── Main component ────────────────────────────────────────────────────────────

export function SpecialistForm({ mode, specialist, onSuccess, onClose }: SpecialistFormProps) {
  const isCreate = mode === 'create';

  const [createState, setCreateState] = React.useState<CreateFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    bio: '',
    experienceYears: '',
    commissionRate: '30',
    color: '',
  });

  const [editState, setEditState] = React.useState<EditFormState>({
    specialization: specialist?.specialization ?? '',
    bio: specialist?.bio ?? '',
    experienceYears: specialist?.experienceYears?.toString() ?? '',
    commissionRate: specialist ? (specialist.commissionRate * 100).toFixed(0) : '30',
    color: specialist?.color ?? '',
    status: specialist?.status ?? 'ACTIVE',
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  function setCreate<K extends keyof CreateFormState>(key: K, value: string) {
    setCreateState(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    setServerError(null);
  }

  function setEdit<K extends keyof EditFormState>(key: K, value: string) {
    setEditState(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (isCreate) {
      const validation = validateCreate(createState);
      if (Object.keys(validation).length > 0) { setErrors(validation); return; }

      setSubmitting(true);
      setStatusMessage(LABELS.creatingUser);
      let userId: string | null = null;
      try {
        // Step 1: create user with SPECIALIST role
        const userRes = await apiFetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: createState.firstName.trim(),
            lastName: createState.lastName.trim(),
            email: createState.email.trim(),
            password: createState.password,
            phone: createState.phone.trim() || undefined,
            role: 'SPECIALIST',
            status: 'ACTIVE',
          }),
        });

        const userJson = await userRes.json();
        if (!userRes.ok || !userJson.success) {
          setServerError(userJson.error?.message ?? LABELS.errorServer);
          return;
        }

        userId = userJson.data.user.id as string;

        // Step 2: create specialist profile
        setStatusMessage(LABELS.creatingProfile);
        const commissionRate = parseFloat(createState.commissionRate) / 100;
        const specRes = await apiFetch('/api/admin/specialists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            bio: createState.bio.trim() || undefined,
            specialization: createState.specialization.trim() || undefined,
            experienceYears: createState.experienceYears
              ? parseInt(createState.experienceYears, 10)
              : undefined,
            commissionRate,
            color: createState.color.trim() || undefined,
          }),
        });

        const specJson = await specRes.json();
        if (!specRes.ok || !specJson.success) {
          // Compensate: clean up the orphaned user account
          await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' }).catch(() => {});
          setServerError(specJson.error?.message ?? LABELS.errorServer);
          return;
        }

        onSuccess(specJson.data as SpecialistRecord);
      } catch {
        // If we have a userId but specialist creation threw, attempt cleanup
        if (userId) {
          await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' }).catch(() => {});
        }
        setServerError(LABELS.errorServer);
      } finally {
        setSubmitting(false);
        setStatusMessage(null);
      }
    } else {
      // Edit mode
      const validation = validateEdit(editState);
      if (Object.keys(validation).length > 0) { setErrors(validation); return; }

      setSubmitting(true);
      setStatusMessage(LABELS.saving);
      try {
        const commissionRate = parseFloat(editState.commissionRate) / 100;
        const res = await apiFetch(`/api/admin/specialists/${specialist!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bio: editState.bio.trim() || '',
            specialization: editState.specialization.trim() || '',
            experienceYears: editState.experienceYears
              ? parseInt(editState.experienceYears, 10)
              : undefined,
            commissionRate,
            color: editState.color.trim() || '',
            status: editState.status,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          setServerError(json.error?.message ?? LABELS.errorServer);
          return;
        }

        onSuccess(json.data as SpecialistRecord);
      } catch {
        setServerError(LABELS.errorServer);
      } finally {
        setSubmitting(false);
        setStatusMessage(null);
      }
    }
  }

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !submitting) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  return (
    /* Modal backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specialist-form-title"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!submitting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h2
            id="specialist-form-title"
            className="font-serif text-lg font-medium text-text-primary"
          >
            {isCreate ? LABELS.createTitle : LABELS.editTitle}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-40"
            aria-label={LABELS.btnCancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {/* ── Account section (create only) ── */}
          {isCreate && (
            <section>
              <SectionHeader icon={User} label={LABELS.sectionAccount} />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={LABELS.firstName}
                  value={createState.firstName}
                  onChange={e => setCreate('firstName', e.target.value)}
                  error={errors.firstName}
                  autoComplete="given-name"
                  disabled={submitting}
                  required
                />
                <Input
                  label={LABELS.lastName}
                  value={createState.lastName}
                  onChange={e => setCreate('lastName', e.target.value)}
                  error={errors.lastName}
                  autoComplete="family-name"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="mt-4 space-y-4">
                <Input
                  label={LABELS.email}
                  type="email"
                  value={createState.email}
                  onChange={e => setCreate('email', e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
                <Input
                  label={LABELS.password}
                  type="password"
                  value={createState.password}
                  onChange={e => setCreate('password', e.target.value)}
                  error={errors.password}
                  helperText={!errors.password ? LABELS.passwordHelper : undefined}
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                />
                <Input
                  label={LABELS.phone}
                  type="tel"
                  value={createState.phone}
                  onChange={e => setCreate('phone', e.target.value)}
                  placeholder={LABELS.phonePlaceholder}
                  autoComplete="tel"
                  disabled={submitting}
                />
              </div>
            </section>
          )}

          {/* ── Profile section ── */}
          <section>
            <SectionHeader icon={Briefcase} label={LABELS.sectionProfile} />
            <div className="space-y-4">
              <Input
                label={LABELS.specialization}
                value={isCreate ? createState.specialization : editState.specialization}
                onChange={e =>
                  isCreate
                    ? setCreate('specialization', e.target.value)
                    : setEdit('specialization', e.target.value)
                }
                placeholder={LABELS.specializationPlaceholder}
                disabled={submitting}
              />
              <TextareaField
                label={LABELS.bio}
                value={isCreate ? createState.bio : editState.bio}
                onChange={e =>
                  isCreate
                    ? setCreate('bio', e.target.value)
                    : setEdit('bio', e.target.value)
                }
                placeholder={LABELS.bioPlaceholder}
                disabled={submitting}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={LABELS.experienceYears}
                  type="number"
                  min={0}
                  max={100}
                  value={isCreate ? createState.experienceYears : editState.experienceYears}
                  onChange={e =>
                    isCreate
                      ? setCreate('experienceYears', e.target.value)
                      : setEdit('experienceYears', e.target.value)
                  }
                  disabled={submitting}
                />
                <Input
                  label={LABELS.commissionRate}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={isCreate ? createState.commissionRate : editState.commissionRate}
                  onChange={e =>
                    isCreate
                      ? setCreate('commissionRate', e.target.value)
                      : setEdit('commissionRate', e.target.value)
                  }
                  error={errors.commissionRate}
                  helperText={!errors.commissionRate ? LABELS.commissionHelper : undefined}
                  disabled={submitting}
                />
              </div>
            </div>
          </section>

          {/* ── Calendar section ── */}
          <section>
            <SectionHeader icon={Palette} label={LABELS.sectionCalendar} />
            <div className={cn('space-y-4', !isCreate && 'grid grid-cols-2 gap-4 space-y-0')}>
              <Input
                label={LABELS.calendarColor}
                value={isCreate ? createState.color : editState.color}
                onChange={e =>
                  isCreate
                    ? setCreate('color', e.target.value)
                    : setEdit('color', e.target.value)
                }
                error={errors.color}
                helperText={!errors.color ? LABELS.calendarColorHelper : undefined}
                placeholder="#6366f1"
                rightAddon={
                  <ColorSwatch
                    color={isCreate ? createState.color : editState.color}
                  />
                }
                disabled={submitting}
              />

              {/* Status selector — edit mode only */}
              {!isCreate && (
                <SelectField
                  label={LABELS.status}
                  value={editState.status}
                  onChange={e => setEdit('status', e.target.value)}
                  disabled={submitting}
                >
                  <option value="ACTIVE">{LABELS.statusActive}</option>
                  <option value="INACTIVE">{LABELS.statusInactive}</option>
                  <option value="ON_VACATION">{LABELS.statusVacation}</option>
                  <option value="TERMINATED">{LABELS.statusTerminated}</option>
                </SelectField>
              )}
            </div>
          </section>

          {/* ── Services section (edit only) ── */}
          {!isCreate && specialist && (
            <section>
              <SectionHeader icon={Grid} label={LABELS.sectionServices} />
              <ServicesSection specialistId={specialist.id} />
            </section>
          )}

          {/* ── Schedule section (edit only) ── */}
          {!isCreate && specialist && (
            <section>
              <SectionHeader icon={Calendar} label={LABELS.sectionSchedule} />
              <ScheduleSection specialistId={specialist.id} />
            </section>
          )}

          {/* Server error */}
          {serverError && (
            <div
              role="alert"
              className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400"
            >
              {serverError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-border-luxury">
          {statusMessage && (
            <p className="text-xs text-text-tertiary animate-pulse">{statusMessage}</p>
          )}
          <div className={cn('flex items-center gap-3 ml-auto')}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              {LABELS.btnCancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              onClick={handleSubmit}
            >
              {isCreate ? LABELS.btnCreate : LABELS.btnSave}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
