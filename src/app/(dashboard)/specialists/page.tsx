'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Star, Calendar, TrendingUp, Users, Sparkles,
  Phone, Mail, Edit2, Plus, Check, Loader2,
  ToggleLeft, ToggleRight, X, ChevronRight,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { useLocale } from '@/components/providers/locale-provider';
import {
  type Specialist, type SpecialistStatus,
  getStatusLabel, getStatusVariant,
  ALL_SPECIALIZATIONS, MOCK_SPECIALISTS,
} from './_specialist-types';

// ─── Local form type ──────────────────────────────────────────────────────────

interface EditForm {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specializations: string[];
  isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSpecialist(raw: any, index: number): Specialist {
  const user = raw.user ?? {};
  const status: SpecialistStatus =
    raw.status === 'ACTIVE' ? 'ACTIVE'
    : raw.status === 'INACTIVE' ? 'INACTIVE'
    : raw.status === 'ON_VACATION' ? 'ON_VACATION'
    : raw.status === 'TERMINATED' ? 'TERMINATED'
    : (raw.isActive === false ? 'INACTIVE' : 'ACTIVE');
  return {
    id: raw.id ?? String(index),
    status,
    isActive: status === 'ACTIVE',
    rating: raw.rating != null ? Number(raw.rating) : undefined,
    totalBookings: raw.totalBookings ?? raw._count?.appointments ?? 0,
    revenue: raw.revenue != null ? Number(raw.revenue) * 100 : undefined,
    specializations: Array.isArray(raw.specializations) ? raw.specializations
      : raw.specialization ? [raw.specialization] : [],
    bio: raw.bio,
    experienceYears: raw.experienceYears,
    commissionRate: raw.commissionRate != null ? Number(raw.commissionRate) : undefined,
    color: raw.color,
    todayBookings: raw.todayBookings,
    user: {
      name: user.name ?? raw.name ?? `Мастер ${index + 1}`,
      email: user.email ?? raw.email,
      phone: user.phone ?? raw.phone,
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 text-champagne fill-champagne" />
      <span className="text-sm font-medium text-champagne">{rating.toFixed(1)}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">
      {children}
    </p>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full px-3 py-2.5 rounded-xl text-sm',
        'bg-charcoal border border-border-luxury',
        'text-text-primary placeholder:text-text-tertiary',
        'focus:outline-none focus:border-champagne/50 focus:ring-1 focus:ring-champagne/20 transition-all',
      )}
    />
  );
}

function WorkloadBadge({ count }: { count: number }) {
  const level = count === 0 ? 'empty' : count <= 3 ? 'low' : count <= 6 ? 'normal' : 'high';
  const config = {
    empty: { label: 'Свободен', cls: 'bg-charcoal text-text-tertiary border-border-luxury' },
    low:   { label: `${count} сег.`, cls: 'bg-sage/10 text-sage border-sage/20' },
    normal:{ label: `${count} сег.`, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    high:  { label: `${count} сег.`, cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }[level];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border', config.cls)}>
      <Calendar className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function SpecialistEditDialog({
  specialist, open, onClose, onSave,
}: {
  specialist: Specialist | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Specialist) => void;
}) {
  const [form, setForm] = React.useState<EditForm>({
    name: '', email: '', phone: '', bio: '', specializations: [], isActive: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [newSpec, setNewSpec] = React.useState('');

  React.useEffect(() => {
    if (specialist) {
      setForm({
        name: specialist.user.name,
        email: specialist.user.email ?? '',
        phone: specialist.user.phone ?? '',
        bio: specialist.bio ?? '',
        specializations: specialist.specializations,
        isActive: specialist.isActive,
      });
      setSaved(false);
    }
  }, [specialist]);

  function setField<K extends keyof EditForm>(key: K, val: EditForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleSpec(s: string) {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  }

  function addCustomSpec() {
    const s = newSpec.trim();
    if (s && !form.specializations.includes(s)) {
      setForm((f) => ({ ...f, specializations: [...f.specializations, s] }));
    }
    setNewSpec('');
  }

  async function handleSave() {
    if (!specialist) return;
    setSaving(true);
    try {
      await fetch(`/api/specialists/${specialist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          bio: form.bio, specializations: form.specializations, isActive: form.isActive,
        }),
      });
    } catch { /* optimistic */ }
    const status: SpecialistStatus = form.isActive ? 'ACTIVE' : 'INACTIVE';
    onSave({
      ...specialist,
      bio: form.bio,
      specializations: form.specializations,
      isActive: form.isActive,
      status,
      user: { name: form.name, email: form.email, phone: form.phone },
    });
    setSaved(true);
    setTimeout(onClose, 700);
    setSaving(false);
  }

  if (!specialist) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать мастера</DialogTitle>
          <DialogDescription>Изменения применяются немедленно.</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Avatar + toggle */}
          <div className="flex items-center gap-4">
            <Avatar name={form.name || specialist.user.name} size="lg" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">{form.name}</p>
              {specialist.rating !== undefined && <StarRating rating={specialist.rating} />}
            </div>
            <button
              onClick={() => setField('isActive', !form.isActive)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                form.isActive
                  ? 'bg-sage/10 text-sage border-sage/20 hover:bg-sage/20'
                  : 'bg-charcoal text-text-tertiary border-border-luxury hover:border-border-light',
              )}
            >
              {form.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {form.isActive ? 'Активен' : 'Неактивен'}
            </button>
          </div>

          <div>
            <FieldLabel>Имя мастера</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setField('name', v)} placeholder="Полное имя" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Телефон</FieldLabel>
              <TextInput value={form.phone} onChange={(v) => setField('phone', v)} placeholder="+7 ..." />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput value={form.email} onChange={(v) => setField('email', v)} placeholder="email@..." />
            </div>
          </div>

          <div>
            <FieldLabel>О мастере</FieldLabel>
            <textarea
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Описание специалиста..."
              rows={3}
              className={cn(
                'w-full px-3 py-2.5 rounded-xl text-sm resize-none',
                'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:border-champagne/50 transition-all',
              )}
            />
          </div>

          <div>
            <FieldLabel>Специализации</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ALL_SPECIALIZATIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSpec(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                    form.specializations.includes(s)
                      ? 'bg-champagne/15 text-champagne border-champagne/30'
                      : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newSpec}
                onChange={(e) => setNewSpec(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomSpec()}
                placeholder="Добавить специализацию..."
                className={cn(
                  'flex-1 px-3 py-2 rounded-xl text-xs',
                  'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-champagne/50 transition-all',
                )}
              />
              <button
                onClick={addCustomSpec}
                className="px-3 py-2 rounded-xl bg-charcoal border border-border-luxury text-text-secondary hover:text-text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats read-only */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border-luxury">
            <div className="bg-charcoal rounded-xl p-3 text-center">
              <p className="text-xs text-text-tertiary mb-1">Записей</p>
              <p className="text-base font-semibold text-text-primary">{specialist.totalBookings ?? 0}</p>
            </div>
            <div className="bg-charcoal rounded-xl p-3 text-center">
              <p className="text-xs text-text-tertiary mb-1">Рейтинг</p>
              <p className="text-base font-semibold text-champagne">{specialist.rating?.toFixed(1) ?? '—'}</p>
            </div>
            <div className="bg-charcoal rounded-xl p-3 text-center">
              <p className="text-xs text-text-tertiary mb-1">Выручка</p>
              <p className="text-xs font-semibold text-champagne">
                {specialist.revenue != null ? formatCurrency(specialist.revenue) : '—'}
              </p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Отмена</Button>
          </DialogClose>
          <Button
            variant="primary" size="sm"
            onClick={handleSave}
            disabled={saving || saved}
            isLoading={saving}
            leftIcon={saved ? <Check className="w-4 h-4" /> : undefined}
          >
            {saved ? 'Сохранено' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add specialist dialog ────────────────────────────────────────────────────

function AddSpecialistDialog({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (s: Specialist) => void;
}) {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  function reset() { setName(''); setPhone(''); setEmail(''); setBio(''); setSpecs([]); }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/specialists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), bio, specializations: specs }),
      });
    } catch { /* optimistic */ }
    onAdd({
      id: `new-${Date.now()}`, status: 'ACTIVE', isActive: true,
      specializations: specs, bio: bio.trim() || undefined,
      todayBookings: 0, totalBookings: 0,
      user: { name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined },
    });
    reset();
    onClose();
    setSaving(false);
  }

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm',
    'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
    'focus:outline-none focus:border-champagne/50 transition-all',
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый мастер</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <FieldLabel>Имя *</FieldLabel>
            <input className={inputCls} placeholder="Полное имя" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Телефон</FieldLabel>
              <input className={inputCls} placeholder="+7 ..." value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input className={inputCls} placeholder="email@..." value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel>О мастере</FieldLabel>
            <textarea
              className={cn(inputCls, 'resize-none')}
              rows={2}
              placeholder="Краткое описание..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Специализации</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SPECIALIZATIONS.slice(0, 12).map(s => (
                <button
                  key={s}
                  onClick={() => setSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    specs.includes(s)
                      ? 'bg-champagne/15 text-champagne border-champagne/30'
                      : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm" onClick={reset}>Отмена</Button>
          </DialogClose>
          <Button
            variant="primary" size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            isLoading={saving}
          >
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpecialistsPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [specFilter, setSpecFilter] = React.useState<string>('');
  const [editingSpec, setEditingSpec] = React.useState<Specialist | null>(null);
  const [addingSpec, setAddingSpec] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/specialists');
        if (res.ok) {
          const json = await res.json();
          const raw = Array.isArray(json) ? json : json?.data?.items ?? json?.specialists ?? [];
          const items = raw.map(normalizeSpecialist);
          setSpecialists(items.length > 0 ? items : MOCK_SPECIALISTS);
        } else {
          setSpecialists(MOCK_SPECIALISTS);
        }
      } catch {
        setSpecialists(MOCK_SPECIALISTS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = React.useMemo(() => {
    return specialists.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (specFilter && !s.specializations.some(sp => sp === specFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = s.user.name.toLowerCase();
        const specs = s.specializations.join(' ').toLowerCase();
        if (!name.includes(q) && !specs.includes(q)) return false;
      }
      return true;
    });
  }, [specialists, statusFilter, specFilter, search]);

  const stats = React.useMemo(() => {
    const active = specialists.filter(s => s.isActive).length;
    const totalBookings = specialists.reduce((acc, s) => acc + (s.totalBookings ?? 0), 0);
    const avgRating = specialists.length > 0
      ? specialists.reduce((acc, s) => acc + (s.rating ?? 0), 0) / specialists.length
      : 0;
    const totalRevenue = specialists.reduce((acc, s) => acc + (s.revenue ?? 0), 0);
    const todayTotal = specialists.reduce((acc, s) => acc + (s.todayBookings ?? 0), 0);
    return { active, totalBookings, avgRating, totalRevenue, todayTotal };
  }, [specialists]);

  // All specializations that exist across current specialists
  const availableSpecs = React.useMemo(() => {
    const set = new Set<string>();
    specialists.forEach(s => s.specializations.forEach(sp => set.add(sp)));
    return Array.from(set).sort();
  }, [specialists]);

  function handleSave(updated: Specialist) {
    setSpecialists((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }

  function handleAdd(s: Specialist) {
    setSpecialists(prev => [s, ...prev]);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">
            {t('nav.specialists')}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Команда мастеров · {stats.todayTotal} записей сегодня
          </p>
        </div>
        <Button
          variant="primary" size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setAddingSpec(true)}
        >
          Добавить мастера
        </Button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Активных мастеров"
          value={loading ? '—' : stats.active}
          icon={<Sparkles className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Сегодня записей"
          value={loading ? '—' : stats.todayTotal}
          icon={<Calendar className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Средний рейтинг"
          value={loading ? '—' : stats.avgRating.toFixed(1)}
          icon={<Star className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Общая выручка"
          value={loading ? '—' : formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по имени, специализации..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full pl-9 pr-9 py-2.5 rounded-xl text-sm',
                'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:border-champagne/50 transition-all',
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            {(['all', 'active', 'inactive'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-sm font-medium transition-all border',
                  statusFilter === key
                    ? 'bg-champagne/10 text-champagne border-champagne/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-charcoal border-transparent',
                )}
              >
                {key === 'all' ? 'Все' : key === 'active' ? 'Активные' : 'Неактивные'}
              </button>
            ))}
          </div>
        </div>

        {/* Specialization filter chips */}
        {!loading && availableSpecs.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-text-tertiary shrink-0">Специализация:</span>
            <button
              onClick={() => setSpecFilter('')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                specFilter === ''
                  ? 'bg-champagne/10 text-champagne border-champagne/25'
                  : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
              )}
            >
              Все
            </button>
            {availableSpecs.map(sp => (
              <button
                key={sp}
                onClick={() => setSpecFilter(sp === specFilter ? '' : sp)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  specFilter === sp
                    ? 'bg-champagne/10 text-champagne border-champagne/25'
                    : 'bg-charcoal text-text-secondary border-border-luxury hover:border-border-light',
                )}
              >
                {sp}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-text-tertiary">
          {filtered.length} из {specialists.length} мастеров
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-onyx border border-border-luxury rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-charcoal animate-shimmer" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-charcoal rounded animate-shimmer" />
                  <div className="h-3 w-24 bg-charcoal rounded animate-shimmer" />
                </div>
              </div>
              <div className="h-8 bg-charcoal rounded animate-shimmer" />
              <div className="h-4 bg-charcoal rounded animate-shimmer" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-16 text-center">
          <Users className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">Мастера не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((spec) => (
            <div
              key={spec.id}
              onClick={() => router.push(`/specialists/${spec.id}`)}
              className={cn(
                'bg-onyx border rounded-2xl p-5 transition-all duration-200 group cursor-pointer',
                'hover:border-border-light hover:shadow-luxury',
                spec.isActive ? 'border-border-luxury' : 'border-border-luxury opacity-75',
              )}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={spec.user.name} size="md" className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-champagne transition-colors truncate">
                      {spec.user.name}
                    </p>
                    {spec.rating !== undefined && <StarRating rating={spec.rating} />}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={getStatusVariant(spec.status)} dot>
                    {getStatusLabel(spec.status)}
                  </Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSpec(spec); }}
                    className={cn(
                      'p-1.5 rounded-lg opacity-0 group-hover:opacity-100',
                      'text-text-tertiary hover:text-champagne hover:bg-champagne/10',
                      'transition-all',
                    )}
                    title="Быстрое редактирование"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bio */}
              {spec.bio && (
                <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{spec.bio}</p>
              )}

              {/* Specializations */}
              {spec.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {spec.specializations.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg text-xs bg-charcoal text-text-secondary border border-border-luxury"
                    >
                      {s}
                    </span>
                  ))}
                  {spec.specializations.length > 3 && (
                    <span className="px-2 py-0.5 rounded-lg text-xs bg-charcoal text-text-tertiary border border-border-luxury">
                      +{spec.specializations.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Stats + workload */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-charcoal rounded-xl p-2.5">
                  <p className="text-xs text-text-tertiary mb-0.5">Записей</p>
                  <p className="text-base font-semibold text-text-primary">{spec.totalBookings ?? 0}</p>
                </div>
                <div className="bg-charcoal rounded-xl p-2.5">
                  <p className="text-xs text-text-tertiary mb-0.5">Выручка</p>
                  <p className="text-xs font-semibold text-champagne truncate">
                    {spec.revenue != null ? formatCurrency(spec.revenue) : '—'}
                  </p>
                </div>
              </div>

              {/* Workload today */}
              {spec.todayBookings !== undefined && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-tertiary">Сегодня:</span>
                  <WorkloadBadge count={spec.todayBookings} />
                </div>
              )}

              {/* Contact */}
              <div className="space-y-1 border-t border-border-luxury pt-3">
                {spec.user.phone && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{spec.user.phone}</span>
                  </div>
                )}
                {spec.user.email && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{spec.user.email}</span>
                  </div>
                )}
              </div>

              {/* Profile link hint */}
              <div className="mt-3 pt-3 border-t border-border-luxury flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-champagne/70">Открыть профиль</span>
                <ChevronRight className="w-3.5 h-3.5 text-champagne/70" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-text-tertiary text-center">
          Нажмите на карточку, чтобы открыть профиль · Значок редактирования — для быстрого изменения
        </p>
      )}

      {/* Dialogs */}
      <SpecialistEditDialog
        specialist={editingSpec}
        open={!!editingSpec}
        onClose={() => setEditingSpec(null)}
        onSave={handleSave}
      />
      <AddSpecialistDialog
        open={addingSpec}
        onClose={() => setAddingSpec(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
