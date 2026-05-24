'use client';

import * as React from 'react';
import { X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecialistEditData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  experienceYears: number | null;
  status: string;
  color: string | null;
}

interface Props {
  specialist: SpecialistEditData;
}

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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  ON_VACATION: 'Отпуск',
  INACTIVE: 'Неактивен',
  TERMINATED: 'Уволен',
};

export function SpecialistEditClient({ specialist }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const [form, setForm] = React.useState({
    firstName: specialist.firstName,
    lastName: specialist.lastName,
    phone: specialist.phone ?? '',
    specialization: specialist.specialization ?? '',
    bio: specialist.bio ?? '',
    experienceYears: specialist.experienceYears !== null ? String(specialist.experienceYears) : '',
    status: specialist.status,
    color: specialist.color ?? '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || null,
        specialization: form.specialization.trim() || null,
        bio: form.bio.trim() || null,
        experienceYears: form.experienceYears !== '' ? Number(form.experienceYears) : null,
        status: form.status,
        color: form.color.trim() || null,
      };
      const res = await fetch(`/api/specialists/${specialist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Ошибка сохранения');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 800);
    } catch {
      setError('Сетевая ошибка. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Редактировать
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-luxury-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Редактировать профиль</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Имя *</span>
                  <input value={form.firstName} onChange={set('firstName')} required className={inputCls} placeholder="Имя" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Фамилия *</span>
                  <input value={form.lastName} onChange={set('lastName')} required className={inputCls} placeholder="Фамилия" />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Телефон</span>
                <input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+7 900 000-00-00" />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Специализация</span>
                <input value={form.specialization} onChange={set('specialization')} className={inputCls} placeholder="Массажист, косметолог..." />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Опыт (лет)</span>
                  <input type="number" min="0" max="60" value={form.experienceYears} onChange={set('experienceYears')} className={inputCls} placeholder="0" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Статус</span>
                  <select value={form.status} onChange={set('status')} className={selectCls}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Цвет (HEX)</span>
                <div className="flex gap-2 items-center">
                  <input value={form.color} onChange={set('color')} className={cn(inputCls, 'flex-1')} placeholder="#C9A84C" maxLength={20} />
                  {form.color && /^#[0-9a-fA-F]{3,6}$/.test(form.color) && (
                    <span className="w-8 h-8 rounded-lg border border-border-luxury shrink-0" style={{ backgroundColor: form.color }} />
                  )}
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">О специалисте</span>
                <textarea
                  value={form.bio}
                  onChange={set('bio')}
                  rows={3}
                  className={cn(inputCls, 'resize-none')}
                  placeholder="Краткая биография..."
                />
              </label>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">Сохранено успешно</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne-light transition-colors disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
