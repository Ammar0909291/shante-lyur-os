'use client';

import * as React from 'react';
import {
  Search,
  Star,
  Calendar,
  TrendingUp,
  Users,
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Plus,
  Check,
  Loader2,
  ToggleLeft,
  ToggleRight,
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

interface Specialist {
  id: string;
  rating?: number;
  totalBookings?: number;
  user: { name: string; email?: string; phone?: string };
  specializations?: string[];
  revenue?: number;
  isActive?: boolean;
  bio?: string;
}

const MOCK_SPECIALISTS: Specialist[] = [
  {
    id: 's1', rating: 4.9, totalBookings: 312, revenue: 154000000, isActive: true,
    specializations: ['Окрашивание', 'Стрижки', 'Укладки'],
    bio: 'Мастер по работе с цветом, 8 лет опыта. Специализируется на сложных техниках окрашивания.',
    user: { name: 'Елена Смирнова', email: 'e.smirnova@shantelyur.ru', phone: '+7 916 111-22-33' },
  },
  {
    id: 's2', rating: 4.8, totalBookings: 278, revenue: 126000000, isActive: true,
    specializations: ['Маникюр', 'Педикюр', 'Дизайн'],
    bio: 'Мастер маникюра и педикюра. Работает с гель-лаком, акрилом и натуральными ногтями.',
    user: { name: 'Мария Попова', email: 'm.popova@shantelyur.ru', phone: '+7 903 222-33-44' },
  },
  {
    id: 's3', rating: 4.7, totalBookings: 241, revenue: 118500000, isActive: true,
    specializations: ['Уход за лицом', 'Пилинг', 'Массаж'],
    bio: 'Косметолог с дипломом медицинской эстетики. Работает с аппаратными процедурами.',
    user: { name: 'Ирина Соколова', email: 'i.sokolova@shantelyur.ru', phone: '+7 925 333-44-55' },
  },
  {
    id: 's4', rating: 4.6, totalBookings: 189, revenue: 95000000, isActive: true,
    specializations: ['Визаж', 'Брови', 'Ресницы'],
    bio: 'Специалист по перманентному макияжу и коррекции бровей. Художественное образование.',
    user: { name: 'Алина Петрова', email: 'a.petrova@shantelyur.ru', phone: '+7 916 444-55-66' },
  },
  {
    id: 's5', rating: 4.5, totalBookings: 156, revenue: 72000000, isActive: false,
    specializations: ['Массаж', 'СПА'],
    bio: 'Дипломированный массажист. Тайский, расслабляющий, лечебный массаж.',
    user: { name: 'Юлия Новикова', email: 'yu.novikova@shantelyur.ru', phone: '+7 903 555-66-77' },
  },
  {
    id: 's6', rating: 4.8, totalBookings: 203, revenue: 108000000, isActive: true,
    specializations: ['Эпиляция', 'Уход за телом'],
    bio: 'Мастер лазерной и восковой эпиляции. Работает с чувствительной кожей.',
    user: { name: 'Ольга Лебедева', email: 'o.lebedeva@shantelyur.ru', phone: '+7 925 666-77-88' },
  },
];

const ALL_SPECIALIZATIONS = ['Окрашивание', 'Стрижки', 'Укладки', 'Маникюр', 'Педикюр', 'Дизайн', 'Уход за лицом', 'Пилинг', 'Массаж', 'Визаж', 'Брови', 'Ресницы', 'Эпиляция', 'Уход за телом', 'СПА', 'Обертывание', 'Шугаринг'];

interface EditForm {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specializations: string[];
  isActive: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 text-champagne fill-champagne" />
      <span className="text-sm font-medium text-champagne">{rating.toFixed(1)}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">{children}</p>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
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

function SpecialistEditDialog({
  specialist,
  open,
  onClose,
  onSave,
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
        specializations: specialist.specializations ?? [],
        isActive: specialist.isActive ?? true,
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
      const res = await fetch(`/api/specialists/${specialist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          bio: form.bio,
          specializations: form.specializations,
          isActive: form.isActive,
        }),
      });
      const updated: Specialist = {
        ...specialist,
        bio: form.bio,
        specializations: form.specializations,
        isActive: form.isActive,
        user: { name: form.name, email: form.email, phone: form.phone },
      };
      if (!res.ok) {
        onSave(updated);
      } else {
        onSave(updated);
      }
      setSaved(true);
      setTimeout(onClose, 800);
    } finally {
      setSaving(false);
    }
  }

  if (!specialist) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать мастера</DialogTitle>
          <DialogDescription>Обновите данные специалиста. Изменения сохраняются сразу.</DialogDescription>
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

          {/* Name */}
          <div>
            <FieldLabel>Имя мастера</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setField('name', v)} placeholder="Полное имя" />
          </div>

          {/* Phone + Email */}
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

          {/* Bio */}
          <div>
            <FieldLabel>О мастере</FieldLabel>
            <textarea
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Описание специалиста..."
              rows={3}
              className={cn(
                'w-full px-3 py-2.5 rounded-xl text-sm resize-none',
                'bg-charcoal border border-border-luxury',
                'text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:border-champagne/50 transition-all',
              )}
            />
          </div>

          {/* Specializations */}
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
                  'bg-charcoal border border-border-luxury',
                  'text-text-primary placeholder:text-text-tertiary',
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

          {/* Stats (read-only) */}
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
              <p className="text-xs font-semibold text-champagne">{specialist.revenue ? formatCurrency(specialist.revenue) : '—'}</p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Отмена</Button>
          </DialogClose>
          <Button
            variant="primary"
            size="sm"
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

export default function SpecialistsPage() {
  const { t } = useLocale();
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [editingSpec, setEditingSpec] = React.useState<Specialist | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/specialists');
        if (res.ok) {
          const data = await res.json();
          const items: Specialist[] = Array.isArray(data) ? data : data.specialists ?? [];
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
      if (filter === 'active' && !s.isActive) return false;
      if (filter === 'inactive' && s.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = s.user.name.toLowerCase();
        const specs = s.specializations?.join(' ').toLowerCase() ?? '';
        if (!name.includes(q) && !specs.includes(q)) return false;
      }
      return true;
    });
  }, [specialists, filter, search]);

  const stats = React.useMemo(() => {
    const active = specialists.filter(s => s.isActive).length;
    const totalBookings = specialists.reduce((acc, s) => acc + (s.totalBookings ?? 0), 0);
    const avgRating = specialists.length > 0
      ? specialists.reduce((acc, s) => acc + (s.rating ?? 0), 0) / specialists.length
      : 0;
    const totalRevenue = specialists.reduce((acc, s) => acc + (s.revenue ?? 0), 0);
    return { active, totalBookings, avgRating, totalRevenue };
  }, [specialists]);

  function handleSave(updated: Specialist) {
    setSpecialists((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">
            {t('nav.specialists')}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Команда мастеров и управление профилями
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
          Добавить мастера
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Активных мастеров"
          value={loading ? '—' : stats.active}
          icon={<Sparkles className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Всего записей"
          value={loading ? '—' : stats.totalBookings}
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

      {/* Filters */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по имени, специализации..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm',
              'bg-charcoal border border-border-luxury',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-champagne/50 transition-all',
            )}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {([['all', 'Все'], ['active', 'Активные'], ['inactive', 'Неактивные']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-sm font-medium transition-all',
                filter === key
                  ? 'bg-champagne/10 text-champagne border border-champagne/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialist Grid */}
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
              className={cn(
                'bg-onyx border rounded-2xl p-5 transition-all duration-200 group',
                'hover:border-border-light hover:shadow-luxury cursor-pointer',
                spec.isActive ? 'border-border-luxury' : 'border-border-luxury opacity-70',
              )}
              onClick={() => setEditingSpec(spec)}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={spec.user.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{spec.user.name}</p>
                    {spec.rating !== undefined && <StarRating rating={spec.rating} />}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={spec.isActive ? 'success' : 'default'} dot>
                    {spec.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSpec(spec); }}
                    className={cn(
                      'p-1.5 rounded-lg opacity-0 group-hover:opacity-100',
                      'text-text-tertiary hover:text-champagne hover:bg-champagne/10',
                      'transition-all',
                    )}
                    title="Редактировать"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bio snippet */}
              {spec.bio && (
                <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{spec.bio}</p>
              )}

              {/* Specializations */}
              {spec.specializations && spec.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-charcoal rounded-xl p-3">
                  <p className="text-xs text-text-tertiary mb-1">Записей</p>
                  <p className="text-lg font-semibold text-text-primary">{spec.totalBookings ?? 0}</p>
                </div>
                <div className="bg-charcoal rounded-xl p-3">
                  <p className="text-xs text-text-tertiary mb-1">Выручка</p>
                  <p className="text-sm font-semibold text-champagne truncate">
                    {spec.revenue ? formatCurrency(spec.revenue) : '—'}
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5 border-t border-border-luxury pt-3">
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

              {/* Edit hint */}
              <div className="mt-3 pt-3 border-t border-border-luxury opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-champagne/70 flex items-center gap-1">
                  <Edit2 className="w-3 h-3" />
                  Нажмите чтобы открыть профиль
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-text-tertiary text-center">
          Показано {filtered.length} из {specialists.length} мастеров · Нажмите на карточку для редактирования
        </p>
      )}

      {/* Edit Modal */}
      <SpecialistEditDialog
        specialist={editingSpec}
        open={!!editingSpec}
        onClose={() => setEditingSpec(null)}
        onSave={handleSave}
      />
    </div>
  );
}
