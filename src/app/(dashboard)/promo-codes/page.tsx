'use client';

import * as React from 'react';
import {
  Tag, Plus, Search, Trash2, Edit2, Copy, Check,
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw,
  TrendingUp, Users, Percent, BadgePercent, Clock,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SERVICE';
type PromoStatus  = 'active' | 'expired' | 'inactive' | 'exhausted';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  maxUsesPerUser: number;
  minOrderAmount: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  status: PromoStatus;
  createdAt: string;
  usageCount: number;
}

interface UsageEntry {
  id: string;
  discountAmount: number;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  appointment: { id: string; startAt: string; status: string } | null;
}

interface DetailData extends PromoCode {
  recentUsages: UsageEntry[];
}

const STATUS_COLORS: Record<PromoStatus, string> = {
  active:    'bg-sage/20 text-sage border-sage/30',
  expired:   'bg-red-500/10 text-red-400 border-red-500/20',
  inactive:  'bg-charcoal text-text-tertiary border-border-luxury',
  exhausted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const STATUS_LABELS: Record<PromoStatus, string> = {
  active: 'Активный', expired: 'Истёк', inactive: 'Отключён', exhausted: 'Исчерпан',
};
const DISCOUNT_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: '%', FIXED_AMOUNT: '₽', FREE_SERVICE: 'Бесплатно',
};

function formatDiscount(type: DiscountType, value: number) {
  if (type === 'PERCENTAGE') return `${value}%`;
  if (type === 'FIXED_AMOUNT') return `−${formatCurrency(value * 100)}`;
  return 'Бесплатно';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Create / Edit Form ──────────────────────────────────────────────────────

interface FormState {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  maxUses: string;
  maxUsesPerUser: string;
  minOrderAmount: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

const DEFAULT_FORM: FormState = {
  code: '', description: '', discountType: 'PERCENTAGE',
  discountValue: '', maxUses: '', maxUsesPerUser: '1',
  minOrderAmount: '', validFrom: today, validUntil: nextMonth, isActive: true,
};

function PromoFormModal({
  initial, onSave, onClose,
}: {
  initial?: PromoCode | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(
    initial
      ? {
          code: initial.code,
          description: initial.description ?? '',
          discountType: initial.discountType,
          discountValue: String(initial.discountValue),
          maxUses: initial.maxUses !== null ? String(initial.maxUses) : '',
          maxUsesPerUser: String(initial.maxUsesPerUser),
          minOrderAmount: initial.minOrderAmount !== null ? String(initial.minOrderAmount) : '',
          validFrom: initial.validFrom.slice(0, 10),
          validUntil: initial.validUntil.slice(0, 10),
          isActive: initial.isActive,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const set = (k: keyof FormState, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        code: form.code.toUpperCase().trim(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        maxUsesPerUser: parseInt(form.maxUsesPerUser) || 1,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil + 'T23:59:59').toISOString(),
        isActive: form.isActive,
      };
      const url = initial ? `/api/admin/promo-codes/${initial.id}` : '/api/admin/promo-codes';
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) throw new Error(json.error?.message ?? 'Ошибка сохранения');
      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne/50 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-onyx border border-border-luxury rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h2 className="font-serif text-lg font-medium text-text-primary">
            {initial ? 'Редактировать промокод' : 'Новый промокод'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-charcoal transition-colors">
            <ChevronLeft className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Код <span className="text-red-400">*</span>
              </label>
              <input
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                placeholder="SUMMER25"
                required
                disabled={!!initial}
                className={cn(inputCls, initial && 'opacity-60 cursor-not-allowed')}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Тип скидки
              </label>
              <select
                value={form.discountType}
                onChange={e => set('discountType', e.target.value)}
                className={inputCls}
              >
                <option value="PERCENTAGE">Процент (%)</option>
                <option value="FIXED_AMOUNT">Фиксированная сумма (₽)</option>
                <option value="FREE_SERVICE">Бесплатная услуга</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Размер скидки <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={e => set('discountValue', e.target.value)}
                placeholder={form.discountType === 'PERCENTAGE' ? '10' : '500'}
                min="0"
                max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                step="any"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Макс. использований
              </label>
              <input
                type="number"
                value={form.maxUses}
                onChange={e => set('maxUses', e.target.value)}
                placeholder="Без ограничений"
                min="1"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                На одного клиента
              </label>
              <input
                type="number"
                value={form.maxUsesPerUser}
                onChange={e => set('maxUsesPerUser', e.target.value)}
                min="1"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Мин. сумма заказа (₽)
              </label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={e => set('minOrderAmount', e.target.value)}
                placeholder="Без минимума"
                min="0"
                step="any"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Действует с <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.validFrom}
                onChange={e => set('validFrom', e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Действует до <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.validUntil}
                onChange={e => set('validUntil', e.target.value)}
                min={form.validFrom}
                required
                className={inputCls}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Описание
              </label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Летняя акция, -10% на все процедуры..."
                rows={2}
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  form.isActive ? 'bg-champagne' : 'bg-charcoal border border-border-luxury'
                )}
              >
                <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', form.isActive ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <span className="text-sm text-text-secondary">Активен</span>
            </div>
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-border-luxury">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-luxury text-sm text-text-secondary hover:bg-charcoal transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ codeId, onClose, onEdit }: { codeId: string; onClose: () => void; onEdit: (p: PromoCode) => void }) {
  const [data, setData] = React.useState<DetailData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/promo-codes/${codeId}`, { credentials: 'include' })
      .then(r => r.json() as Promise<{ success: boolean; data: DetailData }>)
      .then(json => { if (json.success) setData(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [codeId]);

  if (loading || !data) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-96 bg-onyx border-l border-border-luxury flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-text-tertiary animate-spin" />
      </div>
    );
  }

  const usagePercent = data.maxUses ? Math.round((data.currentUses / data.maxUses) * 100) : null;
  const totalDiscount = data.recentUsages.reduce((s, u) => s + u.discountAmount, 0);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-onyx border-l border-border-luxury flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-luxury">
        <div>
          <p className="font-mono text-base font-bold text-champagne">{data.code}</p>
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', STATUS_COLORS[data.status])}>
            {STATUS_LABELS[data.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(data)}
            className="p-2 rounded-lg hover:bg-charcoal transition-colors text-text-tertiary hover:text-text-primary"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-charcoal transition-colors text-text-tertiary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-charcoal rounded-xl p-3">
            <p className="text-xs text-text-tertiary mb-1">Скидка</p>
            <p className="text-lg font-semibold text-champagne">{formatDiscount(data.discountType, data.discountValue)}</p>
          </div>
          <div className="bg-charcoal rounded-xl p-3">
            <p className="text-xs text-text-tertiary mb-1">Применений</p>
            <p className="text-lg font-semibold text-text-primary">{data.currentUses}{data.maxUses ? ` / ${data.maxUses}` : ''}</p>
          </div>
          <div className="bg-charcoal rounded-xl p-3">
            <p className="text-xs text-text-tertiary mb-1">Итого скидок</p>
            <p className="text-lg font-semibold text-text-primary">{formatCurrency(totalDiscount * 100)}</p>
          </div>
          <div className="bg-charcoal rounded-xl p-3">
            <p className="text-xs text-text-tertiary mb-1">На клиента</p>
            <p className="text-lg font-semibold text-text-primary">×{data.maxUsesPerUser}</p>
          </div>
        </div>

        {/* Usage bar */}
        {usagePercent !== null && (
          <div>
            <div className="flex justify-between text-xs text-text-tertiary mb-1.5">
              <span>Использование</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', usagePercent >= 90 ? 'bg-red-400' : usagePercent >= 70 ? 'bg-amber-400' : 'bg-sage')}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Validity */}
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-text-tertiary">С</span>
            <span className="text-text-primary">{formatDate(data.validFrom)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">До</span>
            <span className="text-text-primary">{formatDate(data.validUntil)}</span>
          </div>
          {data.minOrderAmount && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Мин. заказ</span>
              <span className="text-text-primary">{formatCurrency(data.minOrderAmount * 100)}</span>
            </div>
          )}
          {data.description && (
            <p className="text-text-secondary text-xs pt-1 border-t border-border-luxury">{data.description}</p>
          )}
        </div>

        {/* Recent usages */}
        <div>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
            Последние применения ({data.recentUsages.length})
          </p>
          {data.recentUsages.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">Ещё не использовался</p>
          ) : (
            <div className="space-y-2">
              {data.recentUsages.map(u => (
                <div key={u.id} className="bg-charcoal rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {u.user.firstName} {u.user.lastName}
                      </p>
                      <p className="text-xs text-text-tertiary">{u.user.email}</p>
                    </div>
                    <p className="text-sm font-semibold text-champagne shrink-0">
                      −{formatCurrency(u.discountAmount * 100)}
                    </p>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">{formatDate(u.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PromoCodesPage() {
  useLanguage();
  const [items, setItems]           = React.useState<PromoCode[]>([]);
  const [total, setTotal]           = React.useState(0);
  const [loading, setLoading]       = React.useState(true);
  const [search, setSearch]         = React.useState('');
  const [statusFilter, setFilter]   = React.useState<string>('all');
  const [page, setPage]             = React.useState(1);
  const [showForm, setShowForm]     = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PromoCode | null>(null);
  const [detailId, setDetailId]     = React.useState<string | null>(null);
  const [copied, setCopied]         = React.useState<string | null>(null);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit),
        ...(search ? { search } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/admin/promo-codes?${params}`, { credentials: 'include' });
      const json = await res.json() as { success: boolean; data: { items: PromoCode[]; total: number } };
      if (json.success) { setItems(json.data.items); setTotal(json.data.total); }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSearch = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => {
    clearTimeout(debouncedSearch.current);
    debouncedSearch.current = setTimeout(() => { setPage(1); void load(); }, 400);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function toggleActive(p: PromoCode) {
    await fetch(`/api/admin/promo-codes/${p.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    void load();
  }

  async function deleteCode(p: PromoCode) {
    if (!confirm(`Удалить промокод "${p.code}"?`)) return;
    await fetch(`/api/admin/promo-codes/${p.id}`, { method: 'DELETE', credentials: 'include' });
    void load();
  }

  const totalPages = Math.ceil(total / limit);

  // Summary stats from loaded items
  const activeCodes   = items.filter(i => i.status === 'active').length;
  const totalUses     = items.reduce((s, i) => s + i.currentUses, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border-luxury">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-champagne/10 flex items-center justify-center">
              <BadgePercent className="w-5 h-5 text-champagne" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-medium text-text-primary">Промокоды</h1>
              <p className="text-xs text-text-tertiary">{total} кодов всего · {activeCodes} активных</p>
            </div>
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать промокод
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Активных кодов', value: activeCodes, icon: Tag, color: 'text-sage' },
            { label: 'Применений', value: totalUses, icon: Users, color: 'text-champagne' },
            { label: 'Страниц', value: `${page} / ${totalPages || 1}`, icon: TrendingUp, color: 'text-text-secondary' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-charcoal rounded-xl p-3 flex items-center gap-3">
              <Icon className={cn('w-5 h-5 shrink-0', color)} />
              <div>
                <p className="text-xs text-text-tertiary">{label}</p>
                <p className="text-base font-semibold text-text-primary">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-border-luxury flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value.toUpperCase())}
            placeholder="Поиск по коду..."
            className="w-full pl-9 pr-3 py-2 bg-charcoal border border-border-luxury rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne/50"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'expired', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-champagne/15 text-champagne border border-champagne/30'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-charcoal'
              )}
            >
              {{ all: 'Все', active: 'Активные', expired: 'Истёкшие', inactive: 'Отключённые' }[s]}
            </button>
          ))}
        </div>
        <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-charcoal transition-colors text-text-tertiary hover:text-text-primary">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-text-tertiary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <BadgePercent className="w-10 h-10 text-text-tertiary/30" />
            <p className="text-text-tertiary text-sm">Промокоды не найдены</p>
            <button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="text-xs text-champagne hover:underline"
            >
              Создать первый промокод
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                {['Код', 'Тип / Скидка', 'Использование', 'Период', 'Статус', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setDetailId(p.id)}
                  className="border-b border-border-luxury/50 hover:bg-charcoal/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-champagne">{p.code}</span>
                      <button
                        onClick={e => { e.stopPropagation(); copyCode(p.code); }}
                        className="p-1 rounded hover:bg-charcoal transition-colors text-text-tertiary hover:text-text-primary"
                      >
                        {copied === p.code ? <Check className="w-3 h-3 text-sage" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    {p.description && <p className="text-xs text-text-tertiary mt-0.5 truncate max-w-[160px]">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {p.discountType === 'PERCENTAGE' && <Percent className="w-3.5 h-3.5 text-text-tertiary" />}
                      <span className="font-medium text-text-primary">{formatDiscount(p.discountType, p.discountValue)}</span>
                    </div>
                    <p className="text-xs text-text-tertiary">{DISCOUNT_LABELS[p.discountType]}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text-primary">{p.currentUses}{p.maxUses ? ` / ${p.maxUses}` : ''}</p>
                    {p.maxUses && (
                      <div className="mt-1 h-1 w-16 bg-charcoal rounded-full overflow-hidden">
                        <div
                          className="h-full bg-champagne rounded-full"
                          style={{ width: `${Math.min(100, (p.currentUses / p.maxUses) * 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-tertiary" />
                      {formatDate(p.validFrom)} — {formatDate(p.validUntil)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border', STATUS_COLORS[p.status])}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleActive(p)}
                        title={p.isActive ? 'Отключить' : 'Включить'}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
                          p.isActive ? 'bg-champagne' : 'bg-charcoal border border-border-luxury'
                        )}
                      >
                        <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform', p.isActive ? 'translate-x-4.5' : 'translate-x-0.5')} />
                      </button>
                      <button
                        onClick={() => { setEditTarget(p); setShowForm(true); }}
                        className="p-1.5 rounded hover:bg-charcoal transition-colors text-text-tertiary hover:text-text-primary"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void deleteCode(p)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-text-tertiary hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-border-luxury flex items-center justify-between">
          <p className="text-xs text-text-tertiary">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-charcoal disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            </button>
            <span className="text-xs text-text-secondary px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-charcoal disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PromoFormModal
          initial={editTarget}
          onSave={() => { setShowForm(false); setEditTarget(null); void load(); }}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {detailId && (
        <>
          <div className="fixed inset-0 z-30 bg-obsidian/20" onClick={() => setDetailId(null)} />
          <DetailDrawer
            codeId={detailId}
            onClose={() => setDetailId(null)}
            onEdit={p => { setDetailId(null); setEditTarget(p); setShowForm(true); }}
          />
        </>
      )}
    </div>
  );
}
