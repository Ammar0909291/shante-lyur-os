'use client';

import * as React from 'react';
import { Plus, Search, Package, AlertTriangle, TrendingDown, Clock, X, ChevronDown, BarChart2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number | null;
  supplier: string | null;
  expiresAt: string | null;
  isActive: boolean;
  notes: string | null;
  stockStatus: StockStatus;
  totalValue: number | null;
}

interface Summary { lowStockCount: number; totalValue: number; expiringSoon: number; }

interface Alert { id: string; name: string; category: string; currentStock?: number; minStock?: number; unit?: string; severity: string; expiresAt?: string; daysLeft?: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  COSMETOLOGY_INJECTABLES: 'Инъектаблы',
  COSMETOLOGY_SKINCARE:    'Уходовая косметика',
  COSMETOLOGY_CONSUMABLES: 'Косметологические расходники',
  MASSAGE_OILS:            'Массажные масла',
  MASSAGE_CONSUMABLES:     'Массажные расходники',
  GENERAL:                 'Общие расходники',
};

const UNITS = ['мл', 'шт', 'г', 'кг', 'л', 'упак', 'пар', 'рул'];

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50';
const selectCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StockBadge({ status, current, unit }: { status: StockStatus; current: number; min: number; unit: string }) {
  const cfg: Record<StockStatus, { label: string; cls: string }> = {
    ok:       { label: 'В норме',   cls: 'bg-green-500/15 text-green-400 border-green-500/25' },
    low:      { label: 'Мало',      cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    critical: { label: 'Критично',  cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
    out:      { label: 'Нет',       cls: 'bg-red-600/20 text-red-300 border-red-600/30' },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border font-medium', cls)}>
      {label} · {current} {unit}
    </span>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

interface ItemFormData {
  name: string; sku: string; category: string; unit: string;
  currentStock: string; minStock: string; costPerUnit: string;
  supplier: string; expiresAt: string; notes: string;
}

const DEFAULT_FORM: ItemFormData = {
  name: '', sku: '', category: 'GENERAL', unit: 'шт',
  currentStock: '0', minStock: '0', costPerUnit: '', supplier: '', expiresAt: '', notes: '',
};

function ItemModal({ item, onClose, onSaved }: {
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(item);
  const [form, setForm] = React.useState<ItemFormData>(
    item ? {
      name: item.name, sku: item.sku ?? '', category: item.category, unit: item.unit,
      currentStock: String(item.currentStock), minStock: String(item.minStock),
      costPerUnit: item.costPerUnit !== null ? String(item.costPerUnit) : '',
      supplier: item.supplier ?? '', expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '',
      notes: item.notes ?? '',
    } : DEFAULT_FORM
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const set = (k: keyof ItemFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Укажите название'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(), sku: form.sku.trim() || undefined, category: form.category, unit: form.unit,
        currentStock: parseFloat(form.currentStock) || 0, minStock: parseFloat(form.minStock) || 0,
        costPerUnit: form.costPerUnit ? parseFloat(form.costPerUnit) : undefined,
        supplier: form.supplier.trim() || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
      };
      const url = isEdit ? `/api/admin/inventory/${item!.id}` : '/api/admin/inventory';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? 'Ошибка сохранения'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-obsidian border border-border-luxury rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h3 className="font-serif text-lg font-medium text-text-primary">{isEdit ? 'Редактировать позицию' : 'Добавить позицию'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Название *</label>
              <input value={form.name} onChange={set('name')} placeholder="Масло для массажа" disabled={saving} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Категория *</label>
              <select value={form.category} onChange={set('category')} disabled={saving} className={selectCls}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Единица измерения *</label>
              <select value={form.unit} onChange={set('unit')} disabled={saving} className={selectCls}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">{isEdit ? 'Мин. остаток' : 'Текущий остаток'}</label>
              <input type="number" min="0" step="0.01" value={isEdit ? form.minStock : form.currentStock}
                onChange={isEdit ? set('minStock') : set('currentStock')} disabled={saving} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">{isEdit ? 'Текущий остаток' : 'Мин. остаток (порог)'}</label>
              <input type="number" min="0" step="0.01" value={isEdit ? form.currentStock : form.minStock}
                onChange={isEdit ? set('currentStock') : set('minStock')} disabled={saving} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Цена за ед. (₽)</label>
              <input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={set('costPerUnit')} placeholder="0.00" disabled={saving} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Артикул (SKU)</label>
              <input value={form.sku} onChange={set('sku')} placeholder="ABC-001" disabled={saving} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Поставщик</label>
              <input value={form.supplier} onChange={set('supplier')} placeholder="ООО Ромашка" disabled={saving} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Срок годности</label>
              <input type="date" value={form.expiresAt} onChange={set('expiresAt')} disabled={saving} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Примечания</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2} disabled={saving} className={`${inputCls} resize-none`} placeholder="Дополнительная информация..." />
            </div>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50">Отмена</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50">
              {saving ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Добавить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Movement Modal ───────────────────────────────────────────────────────────

function MovementModal({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = React.useState('PURCHASE');
  const [quantity, setQuantity] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { setError('Укажите количество'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/inventory/${item.id}/movements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ type, quantity: qty, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-obsidian border border-border-luxury rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Движение: {item.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-tertiary">Текущий остаток: <span className="text-text-primary font-medium">{item.currentStock} {item.unit}</span></p>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Тип операции</label>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={saving} className={selectCls}>
              <option value="PURCHASE">Поступление (+)</option>
              <option value="USAGE">Ручное списание (−)</option>
              <option value="ADJUSTMENT">Корректировка остатка (+/−)</option>
              <option value="WASTE">Брак / Истёк срок (−)</option>
              <option value="RETURN">Возврат поставщику (−)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Количество ({item.unit})</label>
            <input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" disabled={saving} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Причина / Комментарий</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Необязательно" disabled={saving} className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50">Отмена</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50">
              {saving ? 'Запись...' : 'Применить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'items' | 'movements' | 'alerts';

export default function InventoryPage() {
  const [tab, setTab] = React.useState<TabId>('items');
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<Summary>({ lowStockCount: 0, totalValue: 0, expiringSoon: 0 });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [editItem, setEditItem] = React.useState<InventoryItem | null | undefined>(undefined); // undefined = closed
  const [moveItem, setMoveItem] = React.useState<InventoryItem | null>(null);

  // Alerts
  const [alerts, setAlerts] = React.useState<{ lowStock: Alert[]; expiring: Alert[]; expired: Alert[]; counts: { lowStock: number; expiring: number; expired: number } } | null>(null);

  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: '100' });
      if (search) q.set('search', search);
      if (categoryFilter) q.set('category', categoryFilter);
      const res = await fetch(`/api/admin/inventory?${q}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) { setItems(json.data.items); setTotal(json.data.total); setSummary(json.data.summary); }
    } catch {} finally { setLoading(false); }
  }, [search, categoryFilter]);

  const fetchAlerts = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inventory/alerts', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setAlerts(json.data);
    } catch {}
  }, []);

  React.useEffect(() => { fetchItems(); }, [fetchItems]);
  React.useEffect(() => { if (tab === 'alerts') fetchAlerts(); }, [tab, fetchAlerts]);

  const debouncedSearch = React.useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (v: string) => {
    setSearch(v);
    clearTimeout(debouncedSearch.current);
    debouncedSearch.current = setTimeout(() => {}, 0);
  };

  const totalItemsCount = items.length;
  const outOfStockCount = items.filter((i) => i.currentStock <= 0).length;

  // ─── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    const XLSX = await import('xlsx');
    const rows = items.map((i) => ({
      'Название': i.name,
      'Категория': CATEGORIES[i.category] ?? i.category,
      'Единица': i.unit,
      'Остаток': i.currentStock,
      'Мин. остаток': i.minStock,
      'Статус': i.stockStatus === 'ok' ? 'В норме' : i.stockStatus === 'low' ? 'Мало' : i.stockStatus === 'critical' ? 'Критично' : 'Нет',
      'Цена за ед.': i.costPerUnit ?? '',
      'Стоимость запаса': i.totalValue ?? '',
      'Поставщик': i.supplier ?? '',
      'Срок годности': i.expiresAt ? new Date(i.expiresAt).toLocaleDateString('ru-RU') : '',
      'Артикул': i.sku ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [22, 22, 8, 10, 12, 10, 12, 14, 20, 14, 14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Склад');
    XLSX.writeFile(wb, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Склад</h2>
          <p className="text-text-secondary mt-1 text-sm">{loading ? 'Загрузка...' : `${total} позиций`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors">
            <BarChart2 className="w-4 h-4" />Excel
          </button>
          <button onClick={() => setEditItem(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors">
            <Plus className="w-4 h-4" />Добавить
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: <Package className="w-5 h-5" />, label: 'Позиций', value: String(totalItemsCount), sub: `${total} всего` },
          { icon: <TrendingDown className="w-5 h-5" />, label: 'Мало / Нет', value: String(summary.lowStockCount + outOfStockCount), sub: `${outOfStockCount} нет в наличии`, warn: summary.lowStockCount + outOfStockCount > 0 },
          { icon: <AlertTriangle className="w-5 h-5" />, label: 'Стоимость склада', value: `${formatCurrency(summary.totalValue)}`, sub: 'по закупочным ценам' },
          { icon: <Clock className="w-5 h-5" />, label: 'Истекает (30 дн)', value: String(summary.expiringSoon), sub: 'требует внимания', warn: summary.expiringSoon > 0 },
        ].map((card) => (
          <div key={card.label} className={cn('bg-onyx border rounded-2xl p-5', card.warn ? 'border-amber-500/30' : 'border-border-luxury')}>
            <div className={cn('p-2.5 rounded-xl w-fit mb-3', card.warn ? 'bg-amber-500/10 text-amber-400' : 'bg-champagne/10 text-champagne')}>
              {card.icon}
            </div>
            <p className="text-2xl font-semibold text-text-primary tabular-nums">{card.value}</p>
            <p className="text-sm text-text-secondary mt-0.5">{card.label}</p>
            {card.sub && <p className="text-xs text-text-tertiary mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-onyx border border-border-luxury rounded-xl p-1 w-fit">
        {(['items', 'alerts'] as TabId[]).map((t) => {
          const labels: Record<TabId, string> = { items: 'Позиции', movements: 'Движения', alerts: 'Уведомления' };
          const alertCount = alerts ? (alerts.counts.lowStock + alerts.counts.expiring + alerts.counts.expired) : (summary.lowStockCount + summary.expiringSoon);
          return (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm transition-colors relative', tab === t ? 'bg-champagne/10 text-champagne font-medium' : 'text-text-secondary hover:text-text-primary')}>
              {labels[t]}
              {t === 'alerts' && alertCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">{alertCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items Tab */}
      {tab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Поиск по названию, SKU, поставщику..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all" />
            </div>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all cursor-pointer">
                <option value="">Все категории</option>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-text-tertiary text-sm">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">Позиций не найдено</p>
              <p className="text-text-tertiary text-sm mt-1">Добавьте первую позицию склада</p>
            </div>
          ) : (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      {['Название', 'Категория', 'Остаток', 'Мин. остаток', 'Цена / ед.', 'Стоимость', 'Срок годности', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-charcoal/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-text-primary">{item.name}</p>
                          {item.sku && <p className="text-xs text-text-tertiary">SKU: {item.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{CATEGORIES[item.category] ?? item.category}</td>
                        <td className="px-4 py-3">
                          <StockBadge status={item.stockStatus} current={item.currentStock} min={item.minStock} unit={item.unit} />
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{item.minStock} {item.unit}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                          {item.costPerUnit !== null ? `${item.costPerUnit.toLocaleString('ru-RU')} ₽` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                          {item.totalValue !== null ? `${item.totalValue.toLocaleString('ru-RU')} ₽` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary">
                          {item.expiresAt ? (
                            <span className={cn(new Date(item.expiresAt) < new Date() ? 'text-red-400' : new Date(item.expiresAt) < new Date(Date.now() + 30 * 86400000) ? 'text-amber-400' : '')}>
                              {new Date(item.expiresAt).toLocaleDateString('ru-RU')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setMoveItem(item)} className="px-2.5 py-1 rounded-lg text-xs bg-charcoal border border-border-luxury text-text-secondary hover:text-text-primary transition-colors">Движение</button>
                            <button onClick={() => setEditItem(item)} className="px-2.5 py-1 rounded-lg text-xs bg-champagne/10 border border-champagne/20 text-champagne hover:bg-champagne/20 transition-colors">Изменить</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="space-y-6">
          {!alerts ? (
            <div className="text-center py-16 text-text-tertiary text-sm">Загрузка...</div>
          ) : (
            <>
              {alerts.lowStock.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    Мало на складе ({alerts.lowStock.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.lowStock.map((a) => (
                      <div key={a.id} className={cn('bg-onyx border rounded-xl p-4', a.severity === 'critical' ? 'border-red-500/30' : 'border-amber-500/30')}>
                        <p className="font-medium text-text-primary text-sm">{a.name}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{CATEGORIES[a.category] ?? a.category}</p>
                        <p className={cn('text-sm mt-2 tabular-nums', a.severity === 'critical' ? 'text-red-400' : 'text-amber-400')}>
                          {a.currentStock} {a.unit} <span className="text-text-tertiary">/ мин. {a.minStock}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {alerts.expiring.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Истекает срок годности ({alerts.expiring.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.expiring.map((a) => (
                      <div key={a.id} className={cn('bg-onyx border rounded-xl p-4', a.severity === 'critical' ? 'border-red-500/30' : 'border-amber-500/30')}>
                        <p className="font-medium text-text-primary text-sm">{a.name}</p>
                        <p className="text-xs text-text-tertiary">{CATEGORIES[a.category] ?? a.category}</p>
                        <p className={cn('text-sm mt-2', a.severity === 'critical' ? 'text-red-400' : 'text-amber-400')}>
                          {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('ru-RU') : '—'} · осталось {a.daysLeft} дн.
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {alerts.expired.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Истёк срок ({alerts.expired.length}) — требует списания
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.expired.map((a) => (
                      <div key={a.id} className="bg-onyx border border-red-500/30 rounded-xl p-4">
                        <p className="font-medium text-text-primary text-sm">{a.name}</p>
                        <p className="text-xs text-red-400 mt-1">Истёк: {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('ru-RU') : '—'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {alerts.lowStock.length === 0 && alerts.expiring.length === 0 && alerts.expired.length === 0 && (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-text-secondary font-medium">Всё в порядке</p>
                  <p className="text-text-tertiary text-sm mt-1">Нет критических уведомлений по складу</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {editItem !== undefined && (
        <ItemModal item={editItem} onClose={() => setEditItem(undefined)} onSaved={() => { setEditItem(undefined); fetchItems(); }} />
      )}
      {moveItem && (
        <MovementModal item={moveItem} onClose={() => setMoveItem(null)} onSaved={() => { setMoveItem(null); fetchItems(); }} />
      )}
    </div>
  );
}
