'use client';

import * as React from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Check,
  X,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

type StockStatus = 'OK' | 'LOW' | 'OUT';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  costPrice: number;
  supplier?: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  items: InventoryItem[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_INVENTORY: InventoryCategory[] = [
  {
    id: 'c1',
    name: 'Краски и химия',
    items: [
      { id: 'i1', name: 'Краска для волос L\'Oréal (набор)', sku: 'LOR-CLR-001', category: 'c1', quantity: 24, minQuantity: 10, unit: 'шт', costPrice: 180000, supplier: 'ООО Красота' },
      { id: 'i2', name: 'Окислитель 6%', sku: 'OXI-6-001', category: 'c1', quantity: 8, minQuantity: 10, unit: 'л', costPrice: 95000, supplier: 'ООО Красота' },
      { id: 'i3', name: 'Кератин для выравнивания', sku: 'KER-PRO-001', category: 'c1', quantity: 3, minQuantity: 5, unit: 'фл', costPrice: 520000, supplier: 'ProStyle' },
      { id: 'i4', name: 'Тонер пепельный', sku: 'TON-ASH-001', category: 'c1', quantity: 0, minQuantity: 6, unit: 'шт', costPrice: 145000, supplier: 'ООО Красота' },
    ],
  },
  {
    id: 'c2',
    name: 'Маникюр и педикюр',
    items: [
      { id: 'i5', name: 'Гель-лак (ассорти)', sku: 'GEL-MIX-001', category: 'c2', quantity: 87, minQuantity: 20, unit: 'шт', costPrice: 85000, supplier: 'NailPro' },
      { id: 'i6', name: 'Топ-покрытие', sku: 'TOP-PRO-001', category: 'c2', quantity: 15, minQuantity: 10, unit: 'шт', costPrice: 62000, supplier: 'NailPro' },
      { id: 'i7', name: 'Бондер', sku: 'BND-001', category: 'c2', quantity: 4, minQuantity: 8, unit: 'шт', costPrice: 45000, supplier: 'NailPro' },
      { id: 'i8', name: 'Пилка (одноразовая)', sku: 'FIL-DIS-001', category: 'c2', quantity: 200, minQuantity: 50, unit: 'шт', costPrice: 3500, supplier: 'Опт-Сервис' },
    ],
  },
  {
    id: 'c3',
    name: 'Косметика для лица',
    items: [
      { id: 'i9', name: 'Пилинг-гель', sku: 'PEE-GEL-001', category: 'c3', quantity: 6, minQuantity: 5, unit: 'шт', costPrice: 285000, supplier: 'MedEsthetic' },
      { id: 'i10', name: 'Сыворотка антивозрастная', sku: 'SER-AV-001', category: 'c3', quantity: 2, minQuantity: 5, unit: 'шт', costPrice: 480000, supplier: 'MedEsthetic' },
      { id: 'i11', name: 'Крем-маска увлажняющий', sku: 'MSK-HYD-001', category: 'c3', quantity: 9, minQuantity: 6, unit: 'шт', costPrice: 220000, supplier: 'MedEsthetic' },
    ],
  },
  {
    id: 'c4',
    name: 'Расходники',
    items: [
      { id: 'i12', name: 'Полотенца одноразовые', sku: 'TWL-DIS-001', category: 'c4', quantity: 500, minQuantity: 100, unit: 'шт', costPrice: 2500 },
      { id: 'i13', name: 'Перчатки (S)', sku: 'GLV-S-001', category: 'c4', quantity: 80, minQuantity: 50, unit: 'пар', costPrice: 4500 },
      { id: 'i14', name: 'Перчатки (M)', sku: 'GLV-M-001', category: 'c4', quantity: 35, minQuantity: 50, unit: 'пар', costPrice: 4500 },
      { id: 'i15', name: 'Шапочки для душа', sku: 'CAP-001', category: 'c4', quantity: 150, minQuantity: 50, unit: 'шт', costPrice: 1500 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.quantity === 0) return 'OUT';
  if (item.quantity < item.minQuantity) return 'LOW';
  return 'OK';
}

function getStockVariant(status: StockStatus): 'success' | 'warning' | 'error' {
  if (status === 'OK') return 'success';
  if (status === 'LOW') return 'warning';
  return 'error';
}

function getStockLabel(status: StockStatus): string {
  if (status === 'OK') return 'В наличии';
  if (status === 'LOW') return 'Мало';
  return 'Нет';
}

// ─── Adjust Dialog ────────────────────────────────────────────────────────────

function AdjustDialog({
  item,
  open,
  onClose,
  onSave,
}: {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, newQty: number) => void;
}) {
  const [qty, setQty] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (item) setQty(item.quantity);
  }, [item]);

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      await fetch(`/api/inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
    } catch { /* optimistic */ }
    onSave(item.id, qty);
    setSaving(false);
    onClose();
  }

  if (!item) return null;

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm',
    'bg-charcoal border border-border-luxury',
    'text-text-primary placeholder:text-text-tertiary',
    'focus:outline-none focus:border-champagne/50 transition-all',
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Корректировка остатка</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">Количество ({item.unit})</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(0, qty - 1))}
                className="w-9 h-9 rounded-lg bg-charcoal border border-border-luxury flex items-center justify-center text-text-secondary hover:text-champagne hover:border-champagne/30 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0}
                className={cn(inputCls, 'text-center')}
                value={qty}
                onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
              />
              <button
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-lg bg-charcoal border border-border-luxury flex items-center justify-center text-text-secondary hover:text-champagne hover:border-champagne/30 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 p-3 rounded-xl bg-charcoal border border-border-luxury text-xs text-text-secondary">
            <span>Минимум: <b className="text-text-primary">{item.minQuantity}</b></span>
            <span>Было: <b className="text-text-primary">{item.quantity}</b></span>
            <span>Стало: <b className={cn('font-semibold', qty === 0 ? 'text-rose-400' : qty < item.minQuantity ? 'text-amber-400' : 'text-sage')}>{qty}</b></span>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Отмена</Button>
          </DialogClose>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} disabled={saving}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { t } = useLocale();
  const [categories, setCategories] = React.useState<InventoryCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StockStatus | 'ALL'>('ALL');
  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(new Set());
  const [adjustItem, setAdjustItem] = React.useState<InventoryItem | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/inventory');
        if (res.ok) {
          const data = await res.json();
          const raw = Array.isArray(data) ? data : data.items ?? [];
          if (raw.length > 0) {
            setCategories(raw);
            setExpandedCats(new Set(raw.map((c: InventoryCategory) => c.id)));
          } else {
            setCategories(MOCK_INVENTORY);
            setExpandedCats(new Set(MOCK_INVENTORY.map(c => c.id)));
          }
        } else {
          setCategories(MOCK_INVENTORY);
          setExpandedCats(new Set(MOCK_INVENTORY.map(c => c.id)));
        }
      } catch {
        setCategories(MOCK_INVENTORY);
        setExpandedCats(new Set(MOCK_INVENTORY.map(c => c.id)));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allItems = React.useMemo(() => categories.flatMap(c => c.items), [categories]);

  const stats = React.useMemo(() => {
    const total = allItems.length;
    const low = allItems.filter(i => getStockStatus(i) === 'LOW').length;
    const out = allItems.filter(i => getStockStatus(i) === 'OUT').length;
    const totalValue = allItems.reduce((s, i) => s + i.quantity * i.costPrice, 0);
    return { total, low, out, totalValue };
  }, [allItems]);

  const filteredCategories = React.useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        if (statusFilter !== 'ALL' && getStockStatus(item) !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
        }
        return true;
      }),
    })).filter(cat => cat.items.length > 0);
  }, [categories, search, statusFilter]);

  function handleAdjustSave(id: string, newQty: number) {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(item => item.id === id ? { ...item, quantity: newQty } : item),
    })));
  }

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">Склад</h1>
          <p className="text-sm text-text-secondary mt-0.5">Товарные запасы и расходные материалы</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Позиций всего"
          value={loading ? '—' : stats.total}
          icon={<Package className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Мало в наличии"
          value={loading ? '—' : stats.low}
          icon={<AlertTriangle className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Нет в наличии"
          value={loading ? '—' : stats.out}
          icon={<X className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Стоимость склада"
          value={loading ? '—' : formatCurrency(stats.totalValue)}
          icon={<ShoppingCart className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию или артикулу..."
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
        <div className="flex gap-2">
          {(['ALL', 'OK', 'LOW', 'OUT'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap',
                statusFilter === s
                  ? 'bg-champagne/15 text-champagne border-champagne/30'
                  : 'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary',
              )}
            >
              {s === 'ALL' ? 'Все' : s === 'OK' ? 'В наличии' : s === 'LOW' ? 'Мало' : 'Нет'}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-onyx border border-border-luxury rounded-2xl p-5 space-y-3">
              <div className="h-5 w-32 bg-charcoal rounded animate-shimmer" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-14 bg-charcoal rounded-xl animate-shimmer" />
              ))}
            </div>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-16 text-center">
          <Package className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">Позиции не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCats.has(cat.id);
            return (
              <div key={cat.id} className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-charcoal/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">{cat.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-charcoal text-text-tertiary border border-border-luxury">
                      {cat.items.length}
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-text-tertiary" />
                    : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border-luxury">
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-border-luxury bg-charcoal/20">
                      <span className="col-span-4 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Позиция</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Артикул</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-right">Кол-во</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-right">Цена</span>
                      <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Статус</span>
                    </div>
                    <div className="divide-y divide-border-luxury">
                      {cat.items.map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <div
                            key={item.id}
                            className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 hover:bg-charcoal/30 transition-colors group cursor-pointer"
                            onClick={() => setAdjustItem(item)}
                          >
                            <div className="col-span-4">
                              <p className="text-sm font-medium text-text-primary">{item.name}</p>
                              {item.supplier && (
                                <p className="text-xs text-text-tertiary mt-0.5">{item.supplier}</p>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs font-mono text-text-tertiary">{item.sku}</span>
                            </div>
                            <div className="col-span-2 sm:text-right">
                              <span className={cn(
                                'text-sm font-semibold',
                                status === 'OUT' ? 'text-rose-400' : status === 'LOW' ? 'text-amber-400' : 'text-text-primary',
                              )}>
                                {item.quantity}
                              </span>
                              <span className="text-xs text-text-tertiary ml-1">{item.unit}</span>
                              <p className="text-xs text-text-tertiary">мин: {item.minQuantity}</p>
                            </div>
                            <div className="col-span-2 sm:text-right">
                              <span className="text-sm text-champagne">{formatCurrency(item.costPrice)}</span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              <Badge variant={getStockVariant(status)} dot>
                                {getStockLabel(status)}
                              </Badge>
                              <button
                                onClick={(e) => { e.stopPropagation(); setAdjustItem(item); }}
                                className="ml-auto p-1.5 rounded-lg text-text-tertiary hover:text-champagne hover:bg-champagne/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Скорректировать"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AdjustDialog
        item={adjustItem}
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        onSave={handleAdjustSave}
      />
    </div>
  );
}
