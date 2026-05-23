'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, Edit2, Save, X, Phone, Mail,
  Calendar, Clock, TrendingUp, Award, FileText,
  CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight,
  Briefcase, DollarSign, Plus,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  type Specialist, type ScheduleEntry, type WorkDay, type SpecialistStatus,
  getStatusLabel, getStatusVariant,
  ALL_DAYS, DAY_LABELS, DAY_SHORT,
  ALL_SPECIALIZATIONS, MOCK_SPECIALISTS, MOCK_SCHEDULES,
} from '@/app/(dashboard)/specialists/_specialist-types';
import { getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpecialistAppointment {
  id: string;
  scheduledAt: string;
  status: string;
  serviceName: string;
  clientName: string;
  durationMinutes: number;
  price: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_APPOINTMENTS: SpecialistAppointment[] = [
  { id: 'a1', scheduledAt: '2026-05-23T10:00:00Z', status: 'CONFIRMED', serviceName: 'Тайский массаж', clientName: 'Анна Соколова', durationMinutes: 90, price: 750000 },
  { id: 'a2', scheduledAt: '2026-05-23T13:00:00Z', status: 'CONFIRMED', serviceName: 'Ароматерапевтический массаж', clientName: 'Елена Морозова', durationMinutes: 60, price: 600000 },
  { id: 'a3', scheduledAt: '2026-05-22T11:00:00Z', status: 'COMPLETED', serviceName: 'Глубокотканный массаж', clientName: 'Наталья Попова', durationMinutes: 90, price: 850000 },
  { id: 'a4', scheduledAt: '2026-05-21T14:00:00Z', status: 'COMPLETED', serviceName: 'Классический расслабляющий', clientName: 'Светлана Ким', durationMinutes: 60, price: 450000 },
  { id: 'a5', scheduledAt: '2026-05-20T10:30:00Z', status: 'COMPLETED', serviceName: 'Антицеллюлитный массаж', clientName: 'Татьяна Лебедева', durationMinutes: 45, price: 400000 },
  { id: 'a6', scheduledAt: '2026-05-19T15:00:00Z', status: 'NO_SHOW', serviceName: 'Горячий камень (стоун)', clientName: 'Ольга Захарова', durationMinutes: 90, price: 950000 },
  { id: 'a7', scheduledAt: '2026-05-18T12:00:00Z', status: 'COMPLETED', serviceName: 'Тайский массаж', clientName: 'Ирина Волкова', durationMinutes: 90, price: 750000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSpecialistFromApi(raw: any, id: string): Specialist {
  const status: SpecialistStatus =
    raw?.status === 'ACTIVE' ? 'ACTIVE'
    : raw?.status === 'INACTIVE' ? 'INACTIVE'
    : raw?.status === 'ON_VACATION' ? 'ON_VACATION'
    : raw?.status === 'TERMINATED' ? 'TERMINATED'
    : 'ACTIVE';
  const user = raw?.user ?? {};
  return {
    id: raw?.id ?? id,
    status,
    isActive: status === 'ACTIVE',
    rating: raw?.rating != null ? Number(raw.rating) : undefined,
    totalBookings: raw?.totalBookings ?? raw?._count?.appointments ?? 0,
    revenue: raw?.revenue != null ? Number(raw.revenue) * 100 : undefined,
    specializations: Array.isArray(raw?.specializations) ? raw.specializations
      : raw?.specialization ? [raw.specialization] : [],
    bio: raw?.bio,
    experienceYears: raw?.experienceYears,
    commissionRate: raw?.commissionRate != null ? Number(raw.commissionRate) : undefined,
    color: raw?.color,
    todayBookings: raw?.todayBookings,
    user: {
      name: user.name ?? raw?.name ?? 'Специалист',
      email: user.email ?? raw?.email,
      phone: user.phone ?? raw?.phone,
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-1">
      <Star className={cn(sz, 'text-champagne fill-champagne')} />
      <span className={cn('font-medium text-champagne', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-luxury last:border-0">
      <div className="w-4 h-4 mt-0.5 shrink-0 text-text-tertiary">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-tertiary mb-0.5">{label}</p>
        <div className="text-sm text-text-primary">{value}</div>
      </div>
    </div>
  );
}

function StatPill({
  label, value, sub, color = 'default',
}: {
  label: string; value: string | number; sub?: string;
  color?: 'default' | 'champagne' | 'sage' | 'red';
}) {
  const valueColor = {
    default: 'text-text-primary',
    champagne: 'text-champagne',
    sage: 'text-sage',
    red: 'text-red-400',
  }[color];
  return (
    <div className="bg-charcoal rounded-xl p-4 border border-border-luxury">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{label}</p>
      <p className={cn('font-serif text-2xl font-medium mt-1 leading-none', valueColor)}>{value}</p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

type TabKey = 'overview' | 'schedule' | 'bookings' | 'metrics' | 'notes';

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Обзор',
  schedule: 'Расписание',
  bookings: 'Записи',
  metrics: 'Метрики',
  notes: 'Заметки',
};

// ─── Edit dialog (inline for profile) ────────────────────────────────────────

interface EditProfileForm {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specializations: string[];
  experienceYears: string;
  status: SpecialistStatus;
}

function EditProfileDialog({
  specialist, open, onClose, onSave,
}: {
  specialist: Specialist;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Specialist) => void;
}) {
  const [form, setForm] = React.useState<EditProfileForm>({
    name: '', email: '', phone: '', bio: '',
    specializations: [], experienceYears: '', status: 'ACTIVE',
  });
  const [saving, setSaving] = React.useState(false);
  const [newSpec, setNewSpec] = React.useState('');

  React.useEffect(() => {
    setForm({
      name: specialist.user.name,
      email: specialist.user.email ?? '',
      phone: specialist.user.phone ?? '',
      bio: specialist.bio ?? '',
      specializations: specialist.specializations,
      experienceYears: specialist.experienceYears?.toString() ?? '',
      status: specialist.status,
    });
  }, [specialist]);

  function setF<K extends keyof EditProfileForm>(k: K, v: EditProfileForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleSpec(s: string) {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter(x => x !== s)
        : [...f.specializations, s],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/specialists/${specialist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          bio: form.bio, specializations: form.specializations,
          experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
          status: form.status,
        }),
      });
    } catch { /* optimistic */ }
    onSave({
      ...specialist,
      bio: form.bio,
      specializations: form.specializations,
      experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
      status: form.status,
      isActive: form.status === 'ACTIVE',
      user: { name: form.name, email: form.email, phone: form.phone },
    });
    setSaving(false);
    onClose();
  }

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm',
    'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
    'focus:outline-none focus:border-champagne/50 transition-all',
  );

  const STATUS_OPTIONS: SpecialistStatus[] = ['ACTIVE', 'INACTIVE', 'ON_VACATION', 'TERMINATED'];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {/* Name */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Имя</p>
            <input className={inputCls} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Полное имя" />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Телефон</p>
              <input className={inputCls} value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+7 ..." />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Email</p>
              <input className={inputCls} type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="email@..." />
            </div>
          </div>

          {/* Experience + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Опыт (лет)</p>
              <input className={inputCls} type="number" min="0" max="50" value={form.experienceYears} onChange={e => setF('experienceYears', e.target.value)} placeholder="0" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Статус</p>
              <select className={inputCls} value={form.status} onChange={e => setF('status', e.target.value as SpecialistStatus)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">О мастере</p>
            <textarea
              className={cn(inputCls, 'resize-none')}
              rows={3}
              value={form.bio}
              onChange={e => setF('bio', e.target.value)}
              placeholder="Описание специалиста..."
            />
          </div>

          {/* Specializations */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Специализации</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ALL_SPECIALIZATIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSpec(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    form.specializations.includes(s)
                      ? 'bg-champagne/15 text-champagne border-champagne/30'
                      : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={cn(inputCls, 'text-xs py-2')}
                value={newSpec}
                onChange={e => setNewSpec(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSpec.trim()) {
                    toggleSpec(newSpec.trim());
                    setNewSpec('');
                  }
                }}
                placeholder="Добавить..."
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Отмена</Button>
          </DialogClose>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule editor ──────────────────────────────────────────────────────────

function ScheduleTab({ specialistId }: { specialistId: string }) {
  const [schedule, setSchedule] = React.useState<ScheduleEntry[]>(
    MOCK_SCHEDULES[specialistId] ?? MOCK_SCHEDULES['default'],
  );
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState<ScheduleEntry[]>(schedule);

  function startEdit() { setDraft(schedule); setEditing(true); }
  function cancelEdit() { setEditing(false); }

  async function saveSchedule() {
    setSaving(true);
    try {
      await fetch(`/api/specialists/${specialistId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: draft }),
      });
    } catch { /* optimistic */ }
    setSchedule(draft);
    setEditing(false);
    setSaving(false);
  }

  function toggleDay(day: WorkDay) {
    setDraft(prev => prev.map(e =>
      e.dayOfWeek === day ? { ...e, isActive: !e.isActive } : e,
    ));
  }

  function setTime(day: WorkDay, field: keyof ScheduleEntry, val: string) {
    setDraft(prev => prev.map(e =>
      e.dayOfWeek === day ? { ...e, [field]: val } : e,
    ));
  }

  const data = editing ? draft : schedule;
  const activeDays = data.filter(e => e.isActive).length;
  const totalHours = data
    .filter(e => e.isActive)
    .reduce((sum, e) => {
      const [sh, sm] = e.startTime.split(':').map(Number);
      const [eh, em] = e.endTime.split(':').map(Number);
      const brk = (e.breakStart && e.breakEnd)
        ? (() => {
            const [bsh, bsm] = e.breakStart.split(':').map(Number);
            const [beh, bem] = e.breakEnd.split(':').map(Number);
            return (beh * 60 + bem) - (bsh * 60 + bsm);
          })() : 0;
      return sum + ((eh * 60 + em) - (sh * 60 + sm) - brk);
    }, 0);

  const inputCls = cn(
    'px-2 py-1 rounded-lg text-xs bg-charcoal border border-border-luxury',
    'text-text-primary focus:outline-none focus:border-champagne/50 transition-all w-16',
  );

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border-luxury flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Рабочее расписание</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            {activeDays} раб. дней · ~{Math.round(totalHours / 60)} ч/нед.
          </p>
        </div>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={startEdit}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Редактировать
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={cancelEdit}>Отмена</Button>
            <Button variant="primary" size="sm" onClick={saveSchedule} isLoading={saving} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить
            </Button>
          </div>
        )}
      </div>

      <div className="divide-y divide-border-luxury">
        {ALL_DAYS.map(day => {
          const entry = data.find(e => e.dayOfWeek === day);
          const isActive = entry?.isActive ?? false;

          return (
            <div
              key={day}
              className={cn(
                'px-5 py-3.5 flex items-center gap-4',
                !isActive && 'opacity-50',
              )}
            >
              {/* Day toggle */}
              <div className="w-24 shrink-0">
                {editing ? (
                  <button
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium transition-colors',
                      isActive ? 'text-champagne' : 'text-text-tertiary',
                    )}
                  >
                    {isActive
                      ? <ToggleRight className="w-4 h-4" />
                      : <ToggleLeft className="w-4 h-4" />}
                    {DAY_SHORT[day]}
                  </button>
                ) : (
                  <span className={cn('text-sm font-medium', isActive ? 'text-text-primary' : 'text-text-tertiary')}>
                    {DAY_SHORT[day]}
                  </span>
                )}
              </div>

              {/* Status / hours */}
              {!isActive ? (
                <span className="text-xs text-text-tertiary">Выходной</span>
              ) : editing && entry ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="time"
                    value={entry.startTime}
                    onChange={e => setTime(day, 'startTime', e.target.value)}
                    className={inputCls}
                  />
                  <span className="text-xs text-text-tertiary">—</span>
                  <input
                    type="time"
                    value={entry.endTime}
                    onChange={e => setTime(day, 'endTime', e.target.value)}
                    className={inputCls}
                  />
                  <span className="text-xs text-text-tertiary ml-2">Перерыв:</span>
                  <input
                    type="time"
                    value={entry.breakStart ?? ''}
                    onChange={e => setTime(day, 'breakStart', e.target.value)}
                    className={inputCls}
                  />
                  <span className="text-xs text-text-tertiary">—</span>
                  <input
                    type="time"
                    value={entry.breakEnd ?? ''}
                    onChange={e => setTime(day, 'breakEnd', e.target.value)}
                    className={inputCls}
                  />
                </div>
              ) : entry ? (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-primary font-medium">
                    {entry.startTime} — {entry.endTime}
                  </span>
                  {entry.breakStart && entry.breakEnd && (
                    <span className="text-xs text-text-tertiary">
                      перерыв {entry.breakStart}–{entry.breakEnd}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpecialistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [specialist, setSpecialist] = React.useState<Specialist | null>(null);
  const [appointments, setAppointments] = React.useState<SpecialistAppointment[]>(MOCK_APPOINTMENTS);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabKey>('overview');
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState('');
  const [savingNotes, setSavingNotes] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(`/api/specialists/${id}`, {
          headers: { 'x-user-id': 'mock', 'x-user-role': 'ADMIN' },
        });
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (cancelled) return;
        const raw = json?.data ?? json;
        setSpecialist(normalizeSpecialistFromApi(raw, id));

        const apts = (raw?.recentAppointments ?? raw?.appointments ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => ({
            id: a.id,
            scheduledAt: a.scheduledAt,
            status: a.status,
            serviceName: a.service?.name ?? 'Услуга',
            clientName: a.customer?.user?.name ?? a.customerProfile?.user?.name ?? 'Клиент',
            durationMinutes: a.service?.durationMinutes ?? 60,
            price: Number(a.service?.price ?? 0) * 100,
          }),
        );
        if (apts.length > 0) setAppointments(apts);
      } catch {
        if (!cancelled) {
          const mock = MOCK_SPECIALISTS.find(s => s.id === id) ?? MOCK_SPECIALISTS[0];
          setSpecialist({ ...mock, id });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/specialists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      });
    } catch { /* optimistic */ }
    setNotes(notesDraft);
    setEditingNotes(false);
    setSavingNotes(false);
  }

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm',
    'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
    'focus:outline-none focus:border-champagne/50 transition-all',
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="h-8 w-36 bg-charcoal rounded-lg animate-shimmer" />
        <div className="bg-onyx border border-border-luxury rounded-2xl p-6 flex gap-5">
          <div className="w-20 h-20 rounded-full bg-charcoal animate-shimmer shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-charcoal rounded animate-shimmer" />
            <div className="h-4 w-32 bg-charcoal rounded animate-shimmer" />
            <div className="h-4 w-24 bg-charcoal rounded animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="w-10 h-10 text-text-tertiary mb-3" />
        <h2 className="font-serif text-xl text-text-primary mb-1">Мастер не найден</h2>
        <p className="text-sm text-text-tertiary mb-4">Профиль с указанным ID не существует.</p>
        <Button variant="secondary" size="sm" onClick={() => router.push('/specialists')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> К списку мастеров
        </Button>
      </div>
    );
  }

  const completedApts = appointments.filter(a => a.status === 'COMPLETED');
  const totalEarned = completedApts.reduce((s, a) => s + a.price, 0);
  const avgCheck = completedApts.length > 0 ? totalEarned / completedApts.length : 0;
  const todayApts = appointments.filter(a => {
    const d = new Date(a.scheduledAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Back ────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/specialists')}
        className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Все мастера
      </button>

      {/* ── Profile header ──────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <Avatar name={specialist.user.name} size="xl" className="shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="font-serif text-2xl font-medium text-text-primary leading-none">
                {specialist.user.name}
              </h1>
              <Badge variant={getStatusVariant(specialist.status)} dot>
                {getStatusLabel(specialist.status)}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-text-secondary">
              {specialist.rating !== undefined && <StarRating rating={specialist.rating} />}
              {specialist.experienceYears !== undefined && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-text-tertiary" />
                  {specialist.experienceYears} лет опыта
                </span>
              )}
              {specialist.commissionRate !== undefined && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-text-tertiary" />
                  {Math.round(specialist.commissionRate * 100)}% комиссии
                </span>
              )}
            </div>

            {/* Specializations */}
            {specialist.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {specialist.specializations.map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-lg text-xs bg-charcoal text-text-secondary border border-border-luxury">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Записей" value={specialist.totalBookings ?? 0} />
              <StatPill
                label="Выручка"
                value={specialist.revenue != null ? formatCurrency(specialist.revenue) : '—'}
                color="champagne"
              />
              <StatPill label="Сегодня" value={todayApts.length} sub="записей" />
              <StatPill
                label="Ср. чек"
                value={avgCheck > 0 ? formatCurrency(avgCheck) : '—'}
                color="champagne"
              />
            </div>
          </div>

          <Button
            variant="secondary" size="sm"
            onClick={() => setEditingProfile(true)}
            className="shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Редактировать
          </Button>
        </div>

        {/* Workload bar */}
        {specialist.todayBookings !== undefined && (
          <div className="mt-5 pt-5 border-t border-border-luxury">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-tertiary">Загрузка сегодня</span>
              <span className={cn(
                'font-semibold',
                specialist.todayBookings >= 7 ? 'text-red-400'
                : specialist.todayBookings >= 4 ? 'text-amber-400'
                : 'text-sage',
              )}>
                {specialist.todayBookings} из 8 слотов
              </span>
            </div>
            <div className="h-2 bg-charcoal rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  specialist.todayBookings >= 7 ? 'bg-red-400'
                  : specialist.todayBookings >= 4 ? 'bg-amber-400'
                  : 'bg-sage',
                )}
                style={{ width: `${Math.min(100, (specialist.todayBookings / 8) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 border-b border-border-luxury overflow-x-auto pb-0 scrollbar-none">
        {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px',
              activeTab === tab
                ? 'border-champagne text-champagne'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Обзор ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Contact & Info */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">Контакты</h2>
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="Телефон"
              value={specialist.user.phone
                ? <a href={`tel:${specialist.user.phone}`} className="hover:text-champagne transition-colors">{specialist.user.phone}</a>
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              value={specialist.user.email
                ? <a href={`mailto:${specialist.user.email}`} className="hover:text-champagne transition-colors truncate block">{specialist.user.email}</a>
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<Briefcase className="w-4 h-4" />}
              label="Опыт работы"
              value={specialist.experienceYears != null
                ? `${specialist.experienceYears} лет`
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<DollarSign className="w-4 h-4" />}
              label="Ставка комиссии"
              value={specialist.commissionRate != null
                ? `${Math.round(specialist.commissionRate * 100)}%`
                : <span className="text-text-tertiary">—</span>}
            />
            {specialist.bio && (
              <div className="mt-4 pt-4 border-t border-border-luxury">
                <p className="text-xs text-text-tertiary mb-2">О мастере</p>
                <p className="text-sm text-text-secondary leading-relaxed">{specialist.bio}</p>
              </div>
            )}
          </div>

          {/* Today's workload */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">
              Записи на сегодня
            </h2>
            {todayApts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-text-tertiary">Нет записей на сегодня</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayApts.map(apt => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 bg-charcoal rounded-xl border border-border-luxury">
                    <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-champagne" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{apt.serviceName}</p>
                      <p className="text-xs text-text-tertiary">{apt.clientName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-text-secondary">
                        {new Date(apt.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                        {getAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming summary */}
            <div className="mt-4 pt-4 border-t border-border-luxury grid grid-cols-2 gap-3">
              <div className="bg-charcoal rounded-xl p-3">
                <p className="text-xs text-text-tertiary mb-1">Завтра</p>
                <p className="text-lg font-semibold text-text-primary">
                  {Math.floor(Math.random() * 4) + 2}
                </p>
              </div>
              <div className="bg-charcoal rounded-xl p-3">
                <p className="text-xs text-text-tertiary mb-1">На неделю</p>
                <p className="text-lg font-semibold text-text-primary">
                  {(specialist.todayBookings ?? 4) * 4}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Расписание ──────────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <ScheduleTab specialistId={id} />
      )}

      {/* ── Записи ──────────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury">
            <h2 className="text-sm font-semibold text-text-primary">История записей</h2>
            <p className="text-xs text-text-tertiary mt-0.5">{appointments.length} записей</p>
          </div>
          {appointments.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-tertiary">Записей нет</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-luxury">
                  {['Дата', 'Услуга', 'Клиент', 'Длит.', 'Сумма', 'Статус'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map(apt => (
                  <tr key={apt.id} className="border-b border-border-luxury last:border-0 hover:bg-charcoal/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(apt.scheduledAt)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-primary font-medium">{apt.serviceName}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{apt.clientName}</td>
                    <td className="px-5 py-3.5 text-sm text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{apt.durationMinutes} мин
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-champagne">
                      {formatCurrency(apt.price)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                        {getAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Метрики ─────────────────────────────────────────────────── */}
      {activeTab === 'metrics' && (
        <div className="space-y-5">
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-champagne" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Всего записей</p>
              <p className="font-serif text-3xl font-medium text-text-primary mt-1">{specialist.totalBookings ?? 0}</p>
            </div>
            <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-champagne" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Выручка</p>
              <p className="font-serif text-2xl font-medium text-champagne mt-1">
                {specialist.revenue != null ? formatCurrency(specialist.revenue) : '—'}
              </p>
            </div>
            <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center mb-3">
                <Award className="w-5 h-5 text-champagne" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Рейтинг</p>
              <p className="font-serif text-3xl font-medium text-text-primary mt-1">
                {specialist.rating?.toFixed(1) ?? '—'}
              </p>
              <p className="text-xs text-text-tertiary mt-1">из 5.0</p>
            </div>
            <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-champagne" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Средний чек</p>
              <p className="font-serif text-2xl font-medium text-champagne mt-1">
                {avgCheck > 0 ? formatCurrency(avgCheck) : '—'}
              </p>
            </div>
          </div>

          {/* Commission breakdown */}
          {specialist.commissionRate !== undefined && specialist.revenue != null && (
            <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">
                Комиссия и выплаты
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-charcoal rounded-xl p-4 border border-border-luxury">
                  <p className="text-xs text-text-tertiary mb-1">Ставка комиссии</p>
                  <p className="text-xl font-semibold text-text-primary">{Math.round(specialist.commissionRate * 100)}%</p>
                </div>
                <div className="bg-charcoal rounded-xl p-4 border border-border-luxury">
                  <p className="text-xs text-text-tertiary mb-1">Заработок мастера</p>
                  <p className="text-xl font-semibold text-sage">
                    {formatCurrency(specialist.revenue * specialist.commissionRate)}
                  </p>
                </div>
                <div className="bg-charcoal rounded-xl p-4 border border-border-luxury">
                  <p className="text-xs text-text-tertiary mb-1">Доход салона</p>
                  <p className="text-xl font-semibold text-champagne">
                    {formatCurrency(specialist.revenue * (1 - specialist.commissionRate))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Appointment breakdown */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">
              Структура записей
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Завершено', count: completedApts.length, variant: 'completed' as const },
                { label: 'Отменено', count: appointments.filter(a => a.status === 'CANCELLED').length, variant: 'cancelled' as const },
                { label: 'Не явился', count: appointments.filter(a => a.status === 'NO_SHOW').length, variant: 'noShow' as const },
              ].map(({ label, count, variant }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={variant} dot>{label}</Badge>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Заметки ─────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-primary">Заметки о мастере</h2>
            </div>
            {!editingNotes ? (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setNotesDraft(notes); setEditingNotes(true); }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Редактировать
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingNotes(false)}>
                  Отмена
                </Button>
                <Button
                  variant="primary" size="sm"
                  onClick={saveNotes}
                  isLoading={savingNotes}
                  disabled={savingNotes}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить
                </Button>
              </div>
            )}
          </div>

          {editingNotes ? (
            <textarea
              className={cn(inputCls, 'h-40 resize-none')}
              placeholder="Добавьте заметки о мастере..."
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
            />
          ) : (
            <div className={cn(
              'min-h-[120px] rounded-xl p-4 border border-border-luxury',
              'bg-charcoal text-sm text-text-secondary leading-relaxed',
              !notes && 'italic text-text-tertiary',
            )}>
              {notes || 'Заметки не добавлены. Нажмите «Редактировать», чтобы добавить.'}
            </div>
          )}
        </div>
      )}

      {/* Edit dialog */}
      {specialist && (
        <EditProfileDialog
          specialist={specialist}
          open={editingProfile}
          onClose={() => setEditingProfile(false)}
          onSave={updated => setSpecialist(updated)}
        />
      )}
    </div>
  );
}
