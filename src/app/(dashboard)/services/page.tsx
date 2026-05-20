'use client';

import * as React from 'react';
import { Flower2, Plus, X, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  baseDuration: number;
  description: string | null;
  requiresConsultation: boolean;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE: 'Массаж',
  INJECTION: 'Инъекции',
  LASER: 'Лазер',
  BODY_CONTOURING: 'Коррекция тела',
  HAIR_REMOVAL: 'Депиляция',
  FACIAL: 'Уход за лицом',
  OTHER: 'Другое',
};

const CATEGORIES = Object.entries(CATEGORY_LABELS);

const inputCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm',
  'bg-obsidian border border-border-luxury',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);

const selectCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm cursor-pointer',
  'bg-obsidian border border-border-luxury text-text-primary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all',
);

const defaultForm = {
  name: '',
  category: 'OTHER',
  basePrice: '',
  baseDuration: '',
  description: '',
  requiresConsultation: false,
  sortOrder: '0',
};

export default function ServicesPage() {
  const [services, setServices] = React.useState<Service[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState(defaultForm);
  const [showInactive, setShowInactive] = React.useState(false);

  const fetchServices = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services');
      const json = await res.json();
      if (json.success) setServices(json.data);
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Название обязательно'); return; }
    if (!form.basePrice || Number(form.basePrice) < 0) { setError('Укажите корректную цену'); return; }
    if (!form.baseDuration || Number(form.baseDuration) < 1) { setError('Укажите длительность (мин)'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          basePrice: Number(form.basePrice),
          baseDuration: Number(form.baseDuration),
          description: form.description.trim() || undefined,
          requiresConsultation: form.requiresConsultation,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? 'Ошибка создания услуги'); return; }
      setShowModal(false);
      setForm(defaultForm);
      fetchServices();
    } catch {
      setError('Сетевая ошибка. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const res = await fetch(`/api/admin/services?id=${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setServices((prev) =>
          prev.map((s) => s.id === service.id ? { ...s, isActive: !s.isActive } : s)
        );
      }
    } catch {
      // ignore
    }
  };

  const visible = services.filter((s) => showInactive || s.isActive);
  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Услуги</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {loading ? 'Загрузка...' : `${activeCount} активных · ${services.length} всего`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
              showInactive
                ? 'bg-champagne text-obsidian font-medium'
                : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            {showInactive ? 'Скрыть неактивные' : 'Показать все'}
          </button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => { setShowModal(true); setError(''); }}
          >
            Новая услуга
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <Flower2 className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">Услуги не найдены</p>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Добавить услугу
          </Button>
        </div>
      ) : (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Название</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Категория</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Длительность</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Цена</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {visible.map((s) => (
                  <tr key={s.id} className={cn('hover:bg-charcoal/50 transition-colors', !s.isActive && 'opacity-50')}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-text-tertiary mt-0.5 max-w-xs truncate">{s.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </td>
                    <td className="px-4 py-4 text-text-secondary tabular-nums whitespace-nowrap">
                      {s.baseDuration} мин
                    </td>
                    <td className="px-4 py-4 font-medium text-text-primary tabular-nums whitespace-nowrap">
                      {formatCurrency(s.basePrice)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={s.isActive ? 'success' : 'default'} dot>
                        {s.isActive ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActive(s)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          s.isActive
                            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                            : 'text-text-secondary hover:bg-charcoal hover:text-text-primary',
                        )}
                        title={s.isActive ? 'Деактивировать' : 'Активировать'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {s.isActive ? 'Деактивировать' : 'Активировать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border-luxury">
            {visible.map((s) => (
              <div key={s.id} className={cn('px-4 py-4', !s.isActive && 'opacity-50')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{s.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{CATEGORY_LABELS[s.category] ?? s.category}</p>
                  </div>
                  <Badge variant={s.isActive ? 'success' : 'default'} dot>
                    {s.isActive ? 'Активна' : 'Неактивна'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">{s.baseDuration} мин</span>
                    <span className="text-xs font-medium text-champagne">{formatCurrency(s.basePrice)}</span>
                  </div>
                  <button
                    onClick={() => toggleActive(s)}
                    className="text-xs text-text-tertiary hover:text-text-primary"
                  >
                    {s.isActive ? 'Деактивировать' : 'Активировать'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-luxury-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Новая услуга</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Название *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Гиалуроновый пилинг..."
                  className={inputCls}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Категория</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={selectCls}
                >
                  {CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Цена (₽) *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="100"
                    value={form.basePrice}
                    onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                    placeholder="3500"
                    className={inputCls}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Длительность (мин) *</span>
                  <input
                    required
                    type="number"
                    min="1"
                    max="480"
                    value={form.baseDuration}
                    onChange={(e) => setForm((f) => ({ ...f, baseDuration: e.target.value }))}
                    placeholder="60"
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Описание</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Краткое описание процедуры..."
                  className={cn(inputCls, 'resize-none')}
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresConsultation}
                  onChange={(e) => setForm((f) => ({ ...f, requiresConsultation: e.target.checked }))}
                  className="w-4 h-4 rounded border-border-luxury accent-champagne"
                />
                <span className="text-sm text-text-secondary">Требует консультации</span>
              </label>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
                  {submitting ? 'Создание...' : 'Создать услугу'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
