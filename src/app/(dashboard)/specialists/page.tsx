'use client';

import * as React from 'react';
import { Sparkles, Plus, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string | null;
  bio: string | null;
  experienceYears: number | null;
  rating: number | null;
  reviewCount: number;
  status: string;
  color: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  ON_VACATION: 'Отпуск',
  INACTIVE: 'Неактивен',
  TERMINATED: 'Уволен',
};

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    specialization: '',
    bio: '',
    experienceYears: '',
    commissionRate: '0.3',
    color: '#C9A96E',
  });

  const fetchSpecialists = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/specialists?limit=100');
      const json = await res.json();
      if (json.success) {
        setSpecialists(json.data.items);
        setTotal(json.data.total);
      }
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchSpecialists(); }, [fetchSpecialists]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/specialists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          specialization: form.specialization.trim() || undefined,
          bio: form.bio.trim() || undefined,
          experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
          commissionRate: Number(form.commissionRate),
          color: form.color || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Ошибка создания специалиста');
        return;
      }

      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', specialization: '', bio: '', experienceYears: '', commissionRate: '0.3', color: '#C9A96E' });
      fetchSpecialists();
    } catch {
      setError('Сетевая ошибка. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Специалисты</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {loading ? 'Загрузка...' : `${total} специалистов`}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Добавить специалиста
        </Button>
      </div>

      {loading ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : specialists.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <Sparkles className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">Специалисты не добавлены</p>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Добавить специалиста
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {specialists.map((s) => (
            <div key={s.id} className="bg-onyx border border-border-luxury rounded-2xl p-5 flex flex-col gap-3 hover:border-champagne/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <Avatar name={`${s.firstName} ${s.lastName}`} size="md" />
                  {s.color && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-onyx"
                      style={{ backgroundColor: s.color }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary leading-tight">
                    {s.firstName} {s.lastName}
                  </p>
                  {s.specialization && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{s.specialization}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={s.status === 'ACTIVE' ? 'success' : 'default'} dot>
                  {STATUS_LABEL[s.status] ?? s.status}
                </Badge>
                {s.rating !== null && (
                  <span className="flex items-center gap-1 text-xs text-champagne">
                    <Star className="w-3 h-3" />
                    {s.rating.toFixed(1)}
                    <span className="text-text-tertiary">({s.reviewCount})</span>
                  </span>
                )}
              </div>

              {(s.experienceYears !== null || s.bio) && (
                <div className="space-y-1">
                  {s.experienceYears !== null && (
                    <p className="text-xs text-text-tertiary">Опыт: {s.experienceYears} лет</p>
                  )}
                  {s.bio && (
                    <p className="text-xs text-text-secondary line-clamp-2">{s.bio}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-luxury-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Новый специалист</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Имя *</span>
                  <input
                    required
                    {...field('firstName')}
                    placeholder="Мария"
                    className={inputCls}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Фамилия *</span>
                  <input
                    required
                    {...field('lastName')}
                    placeholder="Петрова"
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Email *</span>
                <input
                  required
                  type="email"
                  {...field('email')}
                  placeholder="specialist@salon.ru"
                  className={inputCls}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Специализация</span>
                <input
                  {...field('specialization')}
                  placeholder="Косметолог, массажист..."
                  className={inputCls}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">О специалисте</span>
                <textarea
                  {...field('bio')}
                  rows={3}
                  placeholder="Краткое описание..."
                  className={cn(inputCls, 'resize-none')}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Опыт (лет)</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    {...field('experienceYears')}
                    placeholder="5"
                    className={inputCls}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Комиссия</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    {...field('commissionRate')}
                    placeholder="0.30"
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Цвет в календаре</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border-luxury bg-obsidian cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-text-tertiary font-mono">{form.color}</span>
                </div>
              </label>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Создание...' : 'Создать'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm',
  'bg-obsidian border border-border-luxury',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);
