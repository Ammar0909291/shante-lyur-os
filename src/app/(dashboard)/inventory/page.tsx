import * as React from 'react';
import {
  Package,
  AlertTriangle,
  ShoppingBag,
  Truck,
  BarChart2,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const CATEGORY_CONFIG = {
  CONSUMABLE: { label: 'Расходники',     color: 'bg-blue-500/20 text-blue-300' },
  RETAIL:     { label: 'Розница',        color: 'bg-purple-500/20 text-purple-300' },
  EQUIPMENT:  { label: 'Оборудование',   color: 'bg-slate-500/20 text-slate-300' },
};

const mockSummary = {
  totalItems: 84,
  lowStockCount: 7,
  outOfStockCount: 2,
  totalInventoryValue: 1_248_000,
  totalRetailValue: 2_156_000,
};

const mockLowStock = [
  { id: '1', name: 'Гиалуроновая кислота 1%',  category: 'CONSUMABLE', currentStock: 2,  minStockLevel: 5,  unit: 'фл.' },
  { id: '2', name: 'Маска альгинатная',          category: 'CONSUMABLE', currentStock: 1,  minStockLevel: 10, unit: 'уп.' },
  { id: '3', name: 'Масло арганы 100мл',         category: 'RETAIL',     currentStock: 3,  minStockLevel: 5,  unit: 'шт.' },
  { id: '4', name: 'Перчатки нитрил L (100шт)',  category: 'CONSUMABLE', currentStock: 0,  minStockLevel: 3,  unit: 'уп.' },
  { id: '5', name: 'Пилинг молочный кислотный',  category: 'CONSUMABLE', currentStock: 2,  minStockLevel: 4,  unit: 'фл.' },
  { id: '6', name: 'Сыворотка с витамином C',    category: 'RETAIL',     currentStock: 0,  minStockLevel: 4,  unit: 'шт.' },
  { id: '7', name: 'Антисептик 500мл',           category: 'CONSUMABLE', currentStock: 1,  minStockLevel: 5,  unit: 'фл.' },
];

const mockRecentMovements = [
  { id: '1', item: 'Ботокс Allergan 100ед.',   type: 'PURCHASE',      quantity: 10,  unit: 'фл.', date: '2026-05-17', performedBy: 'Администратор' },
  { id: '2', item: 'Гиалуроновая кислота 1%',  type: 'PROCEDURE_USE', quantity: -1,  unit: 'фл.', date: '2026-05-17', performedBy: 'Мария Иванова' },
  { id: '3', item: 'Масло арганы 100мл',        type: 'RETAIL_SALE',   quantity: -2,  unit: 'шт.', date: '2026-05-17', performedBy: 'Администратор' },
  { id: '4', item: 'Пилинг молочный кислотный', type: 'PROCEDURE_USE', quantity: -1,  unit: 'фл.', date: '2026-05-16', performedBy: 'Алина Петрова' },
  { id: '5', item: 'Маска альгинатная',          type: 'PROCEDURE_USE', quantity: -2,  unit: 'уп.', date: '2026-05-16', performedBy: 'Наталья Сидорова' },
];

const movementTypeLabel: Record<string, string> = {
  PURCHASE:      'Закупка',
  PROCEDURE_USE: 'Процедура',
  RETAIL_SALE:   'Продажа',
  ADJUSTMENT:    'Корректировка',
  RETURN:        'Возврат',
  WASTE:         'Списание',
  TRANSFER:      'Перемещение',
};

const movementTypeColor: Record<string, string> = {
  PURCHASE:      'bg-green-500/20 text-green-300',
  PROCEDURE_USE: 'bg-blue-500/20 text-blue-300',
  RETAIL_SALE:   'bg-purple-500/20 text-purple-300',
  ADJUSTMENT:    'bg-yellow-500/20 text-yellow-300',
  RETURN:        'bg-slate-500/20 text-slate-300',
  WASTE:         'bg-red-500/20 text-red-300',
  TRANSFER:      'bg-cyan-500/20 text-cyan-300',
};

export default function InventoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-text-primary">Склад</h1>
        <p className="text-sm text-text-tertiary mt-1">Расходники, розничные товары и движение запасов</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Позиций на складе"
          value={mockSummary.totalItems}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="Мало запасов"
          value={mockSummary.lowStockCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={mockSummary.outOfStockCount > 0 ? { value: mockSummary.outOfStockCount, label: 'нет в наличии', direction: 'down' } : undefined}
        />
        <StatCard
          title="Стоимость (себест.)"
          value={formatCurrency(mockSummary.totalInventoryValue / 100)}
          icon={<BarChart2 className="w-5 h-5" />}
        />
        <StatCard
          title="Стоимость (розница)"
          value={formatCurrency(mockSummary.totalRetailValue / 100)}
          icon={<ShoppingBag className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock warnings */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-medium text-text-primary">Заканчивается</h2>
            <span className="ml-auto text-xs text-text-tertiary">{mockLowStock.length} позиций</span>
          </div>
          <div className="space-y-3">
            {mockLowStock.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border-luxury last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Остаток: <span className={item.currentStock === 0 ? 'text-red-400 font-medium' : 'text-amber-400 font-medium'}>
                      {item.currentStock} {item.unit}
                    </span>
                    {' / '}мин. {item.minStockLevel} {item.unit}
                  </p>
                </div>
                <Badge className={`text-xs shrink-0 ${CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]?.color}`}>
                  {CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]?.label}
                </Badge>
                {item.currentStock === 0 && (
                  <Badge className="text-xs shrink-0 bg-red-500/20 text-red-300">Нет</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent movements */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-text-secondary" />
            <h2 className="text-base font-medium text-text-primary">Последние движения</h2>
          </div>
          <div className="space-y-3">
            {mockRecentMovements.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-2 border-b border-border-luxury last:border-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${m.quantity > 0 ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {m.quantity > 0
                    ? <ArrowUp className="w-3.5 h-3.5 text-green-400" />
                    : <ArrowDown className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{m.item}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{m.performedBy} · {m.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity} {m.unit}
                  </p>
                  <Badge className={`text-xs mt-1 ${movementTypeColor[m.type] ?? 'bg-slate-500/20 text-slate-300'}`}>
                    {movementTypeLabel[m.type] ?? m.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
        <h2 className="text-base font-medium text-text-primary mb-4">По категориям</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-obsidian border border-border-luxury">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{cfg.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {key === 'CONSUMABLE' ? '54 позиции' : key === 'RETAIL' ? '22 позиции' : '8 позиций'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
