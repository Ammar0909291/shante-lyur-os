'use client';

/**
 * SpecialistForm — create or edit a specialist profile.
 *
 * Localization note: all user-visible strings are defined in the LABELS
 * constant below. When a full i18n library (next-intl, react-i18next) is
 * adopted, replace each LABELS[key] access with t('specialists.form.key').
 */

import * as React from 'react';
import { X, User, Briefcase, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Localization constants ──────────────────────────────────────────────────
const LABELS = {
  createTitle: 'Новый специалист',
  editTitle: 'Редактировать специалиста',
  sectionAccount: 'Учётная запись',
  sectionProfile: 'Профиль специалиста',
  sectionCalendar: 'Параметры календаря',
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
} as const;

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
      try {
        // Step 1: create user with SPECIALIST role
        const userRes = await fetch('/api/admin/users', {
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

        const userId: string = userJson.data.user.id;

        // Step 2: create specialist profile
        setStatusMessage(LABELS.creatingProfile);
        const commissionRate = parseFloat(createState.commissionRate) / 100;
        const specRes = await fetch('/api/admin/specialists', {
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
          setServerError(specJson.error?.message ?? LABELS.errorServer);
          return;
        }

        onSuccess(specJson.data as SpecialistRecord);
      } catch {
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
        const res = await fetch(`/api/admin/specialists/${specialist!.id}`, {
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
