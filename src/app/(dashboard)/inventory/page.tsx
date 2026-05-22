'use client';

import * as React from 'react';
import {
  Plus, Search, Package, AlertTriangle, TrendingDown, Clock,
  X, ChevronDown, BarChart2, Link2, TrendingUp, Trash2, RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

interface InventoryItem {
  id: string; name: string; sku: string | null; category: string; unit: string;
  currentStock: number; minStock: number; costPerUnit: number | null;
  supplier: string | null; expiresAt: string | null; isActive: boolean;
  notes: string | null; stockStatus: StockStatus; totalValue: number | null;
}

interface Summary { lowStockCount: number; totalValue: number; expiringSoon: number; }
interface Alert  { id: string; name: string; category: string; currentStock?: number; minStock?: number; unit?: string; severity: string; expiresAt?: string; daysLeft?: number; }

interface Mapping {
  id: string; inventoryItemId: string; itemName: string; itemUnit: string;
  itemCategory: string; itemStock: number; serviceId: string; serviceName: string;
  serviceCategory: string; quantityPerUse: number; createdAt: string;
}

interface Service { id: string; name: string; category: string; }

interface Analytics {
  period: { days: number; since: string };
  inventoryValue: number; totalConsumableCost: number;
  topConsumed: Array<{ id: string; name: string; unit: string; category: string; totalQty: number; totalCost: number; useCount: number }>;
  procedureCost: Array<{ id: string; name: string; revenue: number; consumableCost: number; margin: number | null; count: number; avgConsumableCost: number }>;
  specialistUsage: Array<{ id: string; name: string; totalCost: number; procedureCount: number }>;
  forecast: Array<{ id: string; name: string; unit: string; currentStock: number; minStock: number; avgDailyUsage: number; daysRemaining: number | null; projectedStockoutDate: string | null; needsReorder: boolean; monthlyUsageEstimate: number }>;
  wasteStats: Array<{ id: string; name: string; unit: string; qty: number; cost: number }>;
  totalWasteCost: number;
}

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

const inputCls  = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50';
const selectCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50';

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ status, current, unit }: { status: StockStatus; current: number; min: number; unit: string }) {
  const cfg: Record<StockStatus, { label: string; cls: string }> = {
    ok:       { label: 'В норме',  cls: 'bg-green-500/15 text-green-400 border-green-500/25' },
    low:      { label: 'Мало',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    critical: { label: 'Критично', cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
    out:      { label: 'Нет',      cls: 'bg-red-600/20 text-red-300 border-red-600/30' },
  };
  const { label, cls } = cfg[status];
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border font-medium', cls)}>{label} · {current} {unit}</span>;
}

// ─── Item Modal ───────────────────────────────────────────────────────────────

interface ItemFormData { name: string; sku: string; category: string; unit: string; currentStock: string; minStock: string; costPerUnit: string; supplier: string; expiresAt: string; notes: string; }
const DEFAULT_FORM: ItemFormData = { name: '', sku: '', category: 'GENERAL', unit: 'шт', currentStock: '0', minStock: '0', costPerUnit: '', supplier: '', expiresAt: '', notes: '' };

function ItemModal({ item, onClose, onSaved }: { item: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(item);
  const [form, setForm] = React.useState<ItemFormData>(
    item ? { name: item.name, sku: item.sku ?? '', category: item.category, unit: item.unit, currentStock: String(item.currentStock), minStock: String(item.minStock), costPerUnit: item.costPerUnit !== null ? String(item.costPerUnit) : '', supplier: item.supplier ?? '', expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '', notes: item.notes ?? '' } : DEFAULT_FORM
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError]   = React.useState('');
  const set = (k: keyof ItemFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Укажите название'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), sku: form.sku.trim() || undefined, category: form.category, unit: form.unit, currentStock: parseFloat(form.currentStock) || 0, minStock: parseFloat(form.minStock) || 0, costPerUnit: form.costPerUnit ? parseFloat(form.costPerUnit) : undefined, supplier: form.supplier.trim() || undefined, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined, notes: form.notes.trim() || undefined };
      const url = isEdit ? `/api/admin/inventory/${item!.id}` : '/api/admin/inventory';
      const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? 'Ошибка сохранения'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-obsidian border border-border-luxury rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h3 className="font-serif text-lg font-medium text-text-primary">{isEdit ? 'Редактировать позицию' : 'Добавить позицию'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-text-secondary mb-1.5">Название *</label><input value={form.name} onChange={set('name')} placeholder="Масло для массажа" disabled={saving} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Категория *</label><select value={form.category} onChange={set('category')} disabled={saving} className={selectCls}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Единица *</label><select value={form.unit} onChange={set('unit')} disabled={saving} className={selectCls}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">{isEdit ? 'Мин. остаток' : 'Текущий остаток'}</label><input type="number" min="0" step="0.01" value={isEdit ? form.minStock : form.currentStock} onChange={isEdit ? set('minStock') : set('currentStock')} disabled={saving} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">{isEdit ? 'Текущий остаток' : 'Мин. остаток'}</label><input type="number" min="0" step="0.01" value={isEdit ? form.currentStock : form.minStock} onChange={isEdit ? set('currentStock') : set('minStock')} disabled={saving} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Цена за ед. (₽)</label><input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={set('costPerUnit')} placeholder="0.00" disabled={saving} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">SKU</label><input value={form.sku} onChange={set('sku')} placeholder="ABC-001" disabled={saving} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Поставщик</label><input value={form.supplier} onChange={set('supplier')} placeholder="ООО Ромашка" disabled={saving} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Срок годности</label><input type="date" value={form.expiresAt} onChange={set('expiresAt')} disabled={saving} className={inputCls} /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-text-secondary mb-1.5">Примечания</label><textarea value={form.notes} onChange={set('notes')} rows={2} disabled={saving} className={`${inputCls} resize-none`} placeholder="Дополнительная информация..." /></div>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50">Отмена</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50">{saving ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Добавить')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Movement Modal ───────────────────────────────────────────────────────────

function MovementModal({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [type, setType]         = React.useState('PURCHASE');
  const [quantity, setQuantity] = React.useState('');
  const [reason, setReason]     = React.useState('');
  const [saving, setSaving]     = React.useState(false);
  const [error, setError]       = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { setError('Укажите количество'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/inventory/${item.id}/movements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ type, quantity: qty, reason: reason.trim() || undefined }) });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-obsidian border border-border-luxury rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Движение: {item.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-tertiary">Текущий остаток: <span className="text-text-primary font-medium">{item.currentStock} {item.unit}</span></p>
          <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Тип операции</label>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={saving} className={selectCls}>
              <option value="PURCHASE">Поступление (+)</option>
              <option value="USAGE">Ручное списание (−)</option>
              <option value="ADJUSTMENT">Корректировка (+/−)</option>
              <option value="WASTE">Брак / Истёк срок (−)</option>
              <option value="RETURN">Возврат поставщику (−)</option>
            </select>
          </div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Количество ({item.unit})</label><input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" disabled={saving} className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1.5">Причина</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Необязательно" disabled={saving} className={inputCls} /></div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50">Отмена</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50">{saving ? 'Запись...' : 'Применить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mapping Modal ────────────────────────────────────────────────────────────

function MappingModal({ items, services, onClose, onSaved }: { items: InventoryItem[]; services: Service[]; onClose: () => void; onSaved: () => void }) {
  const [itemId, setItemId]   = React.useState('');
  const [svcId, setSvcId]     = React.useState('');
  const [qty, setQty]         = React.useState('');
  const [saving, setSaving]   = React.useState(false);
  const [error, setError]     = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || !svcId || !qty) { setError('Заполните все поля'); return; }
    const q = parseFloat(qty);
    if (!q || q <= 0) { setError('Укажите корректное количество'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/inventory/mappings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ inventoryItemId: itemId, serviceId: svcId, quantityPerUse: q }) });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); } finally { setSaving(false); }
  }

  const selectedItem = items.find((i) => i.id === itemId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-obsidian border border-border-luxury rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Привязать расходник</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Услуга</label>
            <select value={svcId} onChange={(e) => setSvcId(e.target.value)} disabled={saving} className={selectCls}>
              <option value="">Выберите услугу...</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Расходник</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={saving} className={selectCls}>
              <option value="">Выберите позицию...</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Расход на процедуру {selectedItem ? `(${selectedItem.unit})` : ''}</label>
            <input type="number" min="0.001" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.000" disabled={saving} className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50">Отмена</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50">{saving ? 'Сохранение...' : 'Привязать'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'items' | 'alerts' | 'mappings' | 'analytics';

export default function InventoryPage() {
  const [tab, setTab]             = React.useState<TabId>('items');
  const [items, setItems]         = React.useState<InventoryItem[]>([]);
  const [total, setTotal]         = React.useState(0);
  const [summary, setSummary]     = React.useState<Summary>({ lowStockCount: 0, totalValue: 0, expiringSoon: 0 });
  const [loading, setLoading]     = React.useState(true);
  const [search, setSearch]       = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [editItem, setEditItem]   = React.useState<InventoryItem | null | undefined>(undefined);
  const [moveItem, setMoveItem]   = React.useState<InventoryItem | null>(null);
  const [alerts, setAlerts]       = React.useState<{ lowStock: Alert[]; expiring: Alert[]; expired: Alert[]; counts: { lowStock: number; expiring: number; expired: number } } | null>(null);
  const [mappings, setMappings]   = React.useState<Mapping[]>([]);
  const [services, setServices]   = React.useState<Service[]>([]);
  const [mappingFilter, setMappingFilter] = React.useState('');
  const [showMappingModal, setShowMappingModal] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null);
  const [analyticsDays, setAnalyticsDays]     = React.useState(30);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);

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

  const fetchMappings = React.useCallback(async () => {
    try {
      const [mRes, sRes] = await Promise.all([
        fetch('/api/admin/inventory/mappings', { credentials: 'include' }),
        fetch('/api/admin/services?limit=200&active=true', { credentials: 'include' }),
      ]);
      const [mJson, sJson] = await Promise.all([mRes.json(), sRes.json()]);
      if (mJson.success) setMappings(mJson.data);
      if (sJson.success) setServices(sJson.data?.services ?? sJson.data ?? []);
    } catch {}
  }, []);

  const fetchAnalytics = React.useCallback(async (days: number) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/analytics?days=${days}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setAnalytics(json.data);
    } catch {} finally { setAnalyticsLoading(false); }
  }, []);

  React.useEffect(() => { fetchItems(); }, [fetchItems]);
  React.useEffect(() => { if (tab === 'alerts')    fetchAlerts(); },              [tab, fetchAlerts]);
  React.useEffect(() => { if (tab === 'mappings')  fetchMappings(); },            [tab, fetchMappings]);
  React.useEffect(() => { if (tab === 'analytics') fetchAnalytics(analyticsDays); }, [tab, analyticsDays, fetchAnalytics]);

  async function deleteMapping(id: string) {
    if (!confirm('Удалить привязку?')) return;
    try {
      const res = await fetch(`/api/admin/inventory/mappings/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (json.success) setMappings((prev) => prev.filter((m) => m.id !== id));
    } catch {}
  }

  const totalItemsCount  = items.length;
  const outOfStockCount  = items.filter((i) => i.currentStock <= 0).length;
  const alertCount       = alerts ? (alerts.counts.lowStock + alerts.counts.expiring + alerts.counts.expired) : (summary.lowStockCount + summary.expiringSoon);
  const filteredMappings = mappings.filter((m) => !mappingFilter || m.serviceName.toLowerCase().includes(mappingFilter.toLowerCase()) || m.itemName.toLowerCase().includes(mappingFilter.toLowerCase()));

  async function handleExport() {
    const XLSX = await import('xlsx');
    const rows = items.map((i) => ({ 'Название': i.name, 'Категория': CATEGORIES[i.category] ?? i.category, 'Единица': i.unit, 'Остаток': i.currentStock, 'Мин. остаток': i.minStock, 'Статус': i.stockStatus === 'ok' ? 'В норме' : i.stockStatus === 'low' ? 'Мало' : i.stockStatus === 'critical' ? 'Критично' : 'Нет', 'Цена за ед.': i.costPerUnit ?? '', 'Стоимость запаса': i.totalValue ?? '', 'Поставщик': i.supplier ?? '', 'Срок годности': i.expiresAt ? new Date(i.expiresAt).toLocaleDateString('ru-RU') : '', 'SKU': i.sku ?? '' }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [22, 22, 8, 10, 12, 10, 12, 14, 20, 14, 14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Склад');
    XLSX.writeFile(wb, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: 'items',     label: 'Позиции' },
    { id: 'alerts',    label: 'Уведомления', badge: alertCount > 0 ? alertCount : undefined },
    { id: 'mappings',  label: 'Привязки расходников' },
    { id: 'analytics', label: 'Аналитика' },
  ];

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
          { icon: <Package className="w-5 h-5" />,     label: 'Позиций',          value: String(totalItemsCount),             sub: `${total} всего` },
          { icon: <TrendingDown className="w-5 h-5" />, label: 'Мало / Нет',       value: String(summary.lowStockCount + outOfStockCount), sub: `${outOfStockCount} нет в наличии`, warn: summary.lowStockCount + outOfStockCount > 0 },
          { icon: <AlertTriangle className="w-5 h-5" />, label: 'Стоимость склада', value: formatCurrency(summary.totalValue),  sub: 'по закупочным ценам' },
          { icon: <Clock className="w-5 h-5" />,        label: 'Истекает (30 дн)', value: String(summary.expiringSoon),        sub: 'требует внимания', warn: summary.expiringSoon > 0 },
        ].map((card) => (
          <div key={card.label} className={cn('bg-onyx border rounded-2xl p-5', card.warn ? 'border-amber-500/30' : 'border-border-luxury')}>
            <div className={cn('p-2.5 rounded-xl w-fit mb-3', card.warn ? 'bg-amber-500/10 text-amber-400' : 'bg-champagne/10 text-champagne')}>{card.icon}</div>
            <p className="text-2xl font-semibold text-text-primary tabular-nums">{card.value}</p>
            <p className="text-sm text-text-secondary mt-0.5">{card.label}</p>
            {card.sub && <p className="text-xs text-text-tertiary mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-onyx border border-border-luxury rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, badge }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-1.5 rounded-lg text-sm transition-colors relative', tab === id ? 'bg-champagne/10 text-champagne font-medium' : 'text-text-secondary hover:text-text-primary')}>
            {label}
            {badge !== undefined && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">{badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Items Tab ─────────────────────────────────────────────────────────── */}
      {tab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, SKU, поставщику..."
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
                  <thead><tr className="border-b border-border-luxury">
                    {['Название', 'Категория', 'Остаток', 'Мин.', 'Цена/ед.', 'Стоимость', 'Срок', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border-luxury">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-charcoal/30 transition-colors">
                        <td className="px-4 py-3"><p className="text-sm font-medium text-text-primary">{item.name}</p>{item.sku && <p className="text-xs text-text-tertiary">SKU: {item.sku}</p>}</td>
                        <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{CATEGORIES[item.category] ?? item.category}</td>
                        <td className="px-4 py-3"><StockBadge status={item.stockStatus} current={item.currentStock} min={item.minStock} unit={item.unit} /></td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{item.minStock} {item.unit}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{item.costPerUnit !== null ? `${item.costPerUnit.toLocaleString('ru-RU')} ₽` : '—'}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{item.totalValue !== null ? `${item.totalValue.toLocaleString('ru-RU')} ₽` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-text-secondary">{item.expiresAt ? (<span className={cn(new Date(item.expiresAt) < new Date() ? 'text-red-400' : new Date(item.expiresAt) < new Date(Date.now() + 30 * 86400000) ? 'text-amber-400' : '')}>{new Date(item.expiresAt).toLocaleDateString('ru-RU')}</span>) : '—'}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2">
                          <button onClick={() => setMoveItem(item)} className="px-2.5 py-1 rounded-lg text-xs bg-charcoal border border-border-luxury text-text-secondary hover:text-text-primary transition-colors">Движение</button>
                          <button onClick={() => setEditItem(item)} className="px-2.5 py-1 rounded-lg text-xs bg-champagne/10 border border-champagne/20 text-champagne hover:bg-champagne/20 transition-colors">Изменить</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Alerts Tab ────────────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div className="space-y-6">
          {!alerts ? <div className="text-center py-16 text-text-tertiary text-sm">Загрузка...</div> : (
            <>
              {alerts.lowStock.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" />Мало на складе ({alerts.lowStock.length})</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.lowStock.map((a) => (
                      <div key={a.id} className={cn('bg-onyx border rounded-xl p-4', a.severity === 'critical' ? 'border-red-500/30' : 'border-amber-500/30')}>
                        <p className="font-medium text-text-primary text-sm">{a.name}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{CATEGORIES[a.category] ?? a.category}</p>
                        <p className={cn('text-sm mt-2 tabular-nums', a.severity === 'critical' ? 'text-red-400' : 'text-amber-400')}>{a.currentStock} {a.unit} <span className="text-text-tertiary">/ мин. {a.minStock}</span></p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {alerts.expiring.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />Истекает срок годности ({alerts.expiring.length})</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.expiring.map((a) => (
                      <div key={a.id} className={cn('bg-onyx border rounded-xl p-4', a.severity === 'critical' ? 'border-red-500/30' : 'border-amber-500/30')}>
                        <p className="font-medium text-text-primary text-sm">{a.name}</p>
                        <p className="text-xs text-text-tertiary">{CATEGORIES[a.category] ?? a.category}</p>
                        <p className={cn('text-sm mt-2', a.severity === 'critical' ? 'text-red-400' : 'text-amber-400')}>{a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('ru-RU') : '—'} · осталось {a.daysLeft} дн.</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {alerts.expired.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />Истёк срок ({alerts.expired.length}) — требует списания</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.expired.map((a) => (<div key={a.id} className="bg-onyx border border-red-500/30 rounded-xl p-4"><p className="font-medium text-text-primary text-sm">{a.name}</p><p className="text-xs text-red-400 mt-1">Истёк: {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('ru-RU') : '—'}</p></div>))}
                  </div>
                </section>
              )}
              {alerts.lowStock.length === 0 && alerts.expiring.length === 0 && alerts.expired.length === 0 && (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-text-secondary font-medium">Всё в порядке</p>
                  <p className="text-text-tertiary text-sm mt-1">Нет критических уведомлений</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Mappings Tab ──────────────────────────────────────────────────────── */}
      {tab === 'mappings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input value={mappingFilter} onChange={(e) => setMappingFilter(e.target.value)} placeholder="Фильтр по услуге или расходнику..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all" />
            </div>
            <button onClick={() => setShowMappingModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors whitespace-nowrap">
              <Link2 className="w-4 h-4" />Привязать расходник
            </button>
          </div>

          {filteredMappings.length === 0 ? (
            <div className="text-center py-16">
              <Link2 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">Привязок нет</p>
              <p className="text-text-tertiary text-sm mt-1">Привяжите расходники к услугам для автоматического списания</p>
            </div>
          ) : (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border-luxury">
                    {['Услуга', 'Расходник', 'Категория', 'Расход/процедуру', 'Текущий запас', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border-luxury">
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className="hover:bg-charcoal/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">{m.serviceName}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{m.itemName}</td>
                        <td className="px-4 py-3 text-xs text-text-secondary">{CATEGORIES[m.itemCategory] ?? m.itemCategory}</td>
                        <td className="px-4 py-3 text-sm text-champagne tabular-nums font-medium">{m.quantityPerUse} {m.itemUnit}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{m.itemStock} {m.itemUnit}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteMapping(m.id)} className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-text-tertiary">Привязки определяют, какие расходники автоматически списываются при завершении процедуры (статус COMPLETED).</p>
        </div>
      )}

      {/* ── Analytics Tab ─────────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">Период:</span>
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setAnalyticsDays(d)}
                className={cn('px-3 py-1.5 rounded-lg text-sm transition-colors', analyticsDays === d ? 'bg-champagne/10 text-champagne border border-champagne/30 font-medium' : 'text-text-secondary hover:text-text-primary border border-border-luxury hover:bg-charcoal')}>
                {d} дн.
              </button>
            ))}
            <button onClick={() => fetchAnalytics(analyticsDays)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border-luxury hover:bg-charcoal transition-colors">
              <RefreshCw className={cn('w-3.5 h-3.5', analyticsLoading && 'animate-spin')} />Обновить
            </button>
          </div>

          {analyticsLoading && !analytics && <div className="text-center py-16 text-text-tertiary text-sm">Загрузка аналитики...</div>}

          {analytics && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Стоимость склада',   value: formatCurrency(analytics.inventoryValue),      icon: <Package className="w-5 h-5" />,    sub: 'текущий запас' },
                  { label: 'Расход за период',    value: formatCurrency(analytics.totalConsumableCost), icon: <TrendingDown className="w-5 h-5" />, sub: `за ${analyticsDays} дней` },
                  { label: 'Брак / списания',     value: formatCurrency(analytics.totalWasteCost),      icon: <AlertTriangle className="w-5 h-5" />, sub: 'потери за период', warn: analytics.totalWasteCost > 0 },
                ].map((c) => (
                  <div key={c.label} className={cn('bg-onyx border rounded-2xl p-5', c.warn ? 'border-amber-500/30' : 'border-border-luxury')}>
                    <div className={cn('p-2.5 rounded-xl w-fit mb-3', c.warn ? 'bg-amber-500/10 text-amber-400' : 'bg-champagne/10 text-champagne')}>{c.icon}</div>
                    <p className="text-2xl font-semibold text-text-primary tabular-nums">{c.value}</p>
                    <p className="text-sm text-text-secondary mt-0.5">{c.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Procedure profitability */}
              {analytics.procedureCost.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-champagne" />Рентабельность процедур</h3>
                  <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-border-luxury">
                          {['Услуга', 'Процедур', 'Выручка', 'Стоим. расходников', 'Ср. расход', 'Маржа %'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-border-luxury">
                          {analytics.procedureCost.map((p) => (
                            <tr key={p.id} className="hover:bg-charcoal/30 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-text-primary">{p.name}</td>
                              <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{p.count}</td>
                              <td className="px-4 py-3 text-sm text-text-primary tabular-nums">{formatCurrency(p.revenue)}</td>
                              <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{formatCurrency(p.consumableCost)}</td>
                              <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{formatCurrency(p.avgConsumableCost)}</td>
                              <td className="px-4 py-3">
                                {p.margin !== null ? (
                                  <span className={cn('text-sm font-medium tabular-nums', p.margin >= 70 ? 'text-green-400' : p.margin >= 40 ? 'text-champagne' : 'text-amber-400')}>{p.margin}%</span>
                                ) : <span className="text-text-tertiary text-sm">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* Top consumed + forecast side by side */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Top consumed */}
                {analytics.topConsumed.length > 0 && (
                  <section>
                    <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-champagne" />Топ расходуемых материалов</h3>
                    <div className="bg-onyx border border-border-luxury rounded-2xl divide-y divide-border-luxury">
                      {analytics.topConsumed.slice(0, 10).map((item, i) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-xs text-text-tertiary w-5 tabular-nums">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                            <p className="text-xs text-text-tertiary">{item.totalQty} {item.unit} · {item.useCount} раз</p>
                          </div>
                          <span className="text-sm text-champagne font-medium tabular-nums">{formatCurrency(item.totalCost)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Forecast */}
                {analytics.forecast.length > 0 && (
                  <section>
                    <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-champagne" />Прогноз остатков</h3>
                    <div className="bg-onyx border border-border-luxury rounded-2xl divide-y divide-border-luxury">
                      {analytics.forecast.slice(0, 10).map((item) => (
                        <div key={item.id} className={cn('flex items-center gap-3 px-4 py-3', item.needsReorder ? 'bg-amber-500/5' : '')}>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', item.needsReorder ? 'text-amber-400' : 'text-text-primary')}>{item.name}</p>
                            <p className="text-xs text-text-tertiary">{item.currentStock} {item.unit} · {item.avgDailyUsage}/дн.</p>
                          </div>
                          <div className="text-right shrink-0">
                            {item.daysRemaining !== null ? (
                              <span className={cn('text-sm font-medium tabular-nums', item.daysRemaining <= 7 ? 'text-red-400' : item.daysRemaining <= 14 ? 'text-amber-400' : 'text-green-400')}>{item.daysRemaining} дн.</span>
                            ) : <span className="text-text-tertiary text-sm">∞</span>}
                            {item.projectedStockoutDate && <p className="text-xs text-text-tertiary">{new Date(item.projectedStockoutDate).toLocaleDateString('ru-RU')}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Specialist usage */}
              {analytics.specialistUsage.length > 0 && (
                <section>
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-champagne" />Расход материалов по специалистам</h3>
                  <div className="bg-onyx border border-border-luxury rounded-2xl divide-y divide-border-luxury">
                    {analytics.specialistUsage.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{s.name}</p>
                          <p className="text-xs text-text-tertiary">{s.procedureCount} процедур</p>
                        </div>
                        <span className="text-sm text-champagne font-medium tabular-nums">{formatCurrency(s.totalCost)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {analytics.topConsumed.length === 0 && analytics.procedureCost.length === 0 && (
                <div className="text-center py-16">
                  <BarChart2 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-text-secondary font-medium">Нет данных за выбранный период</p>
                  <p className="text-text-tertiary text-sm mt-1">Завершите процедуры с привязанными расходниками для отображения аналитики</p>
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
      {showMappingModal && (
        <MappingModal items={items} services={services} onClose={() => setShowMappingModal(false)} onSaved={() => { setShowMappingModal(false); fetchMappings(); }} />
      )}
    </div>
  );
}
