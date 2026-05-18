import * as React from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const PERIOD_STATUS_CONFIG = {
  OPEN:      { label: 'Открыт',   color: 'bg-blue-500/20 text-blue-300' },
  APPROVED:  { label: 'Утверждён', color: 'bg-green-500/20 text-green-300' },
  PAID:      { label: 'Выплачен', color: 'bg-emerald-500/20 text-emerald-300' },
  CANCELLED: { label: 'Отменён',  color: 'bg-red-500/20 text-red-300' },
};

const ADJUSTMENT_TYPE_CONFIG = {
  BONUS:      { label: 'Бонус',      color: 'bg-green-500/20 text-green-300' },
  DEDUCTION:  { label: 'Вычет',      color: 'bg-red-500/20 text-red-300' },
  CORRECTION: { label: 'Корректировка', color: 'bg-slate-500/20 text-slate-300' },
};

const mockOverview = {
  openCount: 1,
  approvedCount: 0,
  paidCount: 4,
  totalPendingPayout: 284_700,
};

const mockPeriods = [
  { id: '1', name: 'Май 2026',    status: 'OPEN',      startDate: '2026-05-01', endDate: '2026-05-31', totalNet: 284_700, specialistCount: 6 },
  { id: '2', name: 'Апрель 2026', status: 'PAID',      startDate: '2026-04-01', endDate: '2026-04-30', totalNet: 318_400, specialistCount: 6 },
  { id: '3', name: 'Март 2026',   status: 'PAID',      startDate: '2026-03-01', endDate: '2026-03-31', totalNet: 302_100, specialistCount: 5 },
];

const mockPayouts = [
  { id: '1', specialistName: 'Анна Соколова',    rate: 0.35, gross: 68_250, deductions: 0, net: 68_250, status: 'PENDING' },
  { id: '2', specialistName: 'Мария Иванова',    rate: 0.30, gross: 52_800, deductions: 1_500, net: 51_300, status: 'PENDING' },
  { id: '3', specialistName: 'Алина Петрова',    rate: 0.30, gross: 48_600, deductions: 0, net: 53_600, status: 'PENDING' }, // has bonus
  { id: '4', specialistName: 'Наталья Сидорова', rate: 0.25, gross: 41_200, deductions: 0, net: 41_200, status: 'PENDING' },
  { id: '5', specialistName: 'Екатерина Ли',     rate: 0.30, gross: 44_350, deductions: 0, net: 44_350, status: 'PENDING' },
  { id: '6', specialistName: 'Светлана Ким',     rate: 0.25, gross: 26_000, deductions: 0, net: 26_000, status: 'PENDING' },
];

const mockAdjustments = [
  { id: '1', specialist: 'Алина Петрова',    type: 'BONUS',     amount: 5_000, reason: 'Высокий рейтинг клиентов за месяц' },
  { id: '2', specialist: 'Мария Иванова',    type: 'DEDUCTION', amount: -1_500, reason: 'Отсутствие без предупреждения' },
];

export default function PayrollPage() {
  const totalPending = mockPayouts.reduce((s, p) => s + p.net, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-text-primary">Зарплата и комиссии</h1>
        <p className="text-sm text-text-tertiary mt-1">Расчёты выплат, комиссии специалистов и история начислений</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ожидает выплаты"
          value={formatCurrency(totalPending / 100)}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Специалистов в периоде"
          value={mockPayouts.length}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Открытых периодов"
          value={mockOverview.openCount}
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Выплачено (апрель)"
          value={formatCurrency(318_400 / 100)}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{ value: 5.4, label: 'vs март', positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current period payouts */}
        <div className="lg:col-span-2 bg-charcoal border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-text-primary">Начисления — Май 2026</h2>
            <Badge className="bg-blue-500/20 text-blue-300 text-xs">OPEN</Badge>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-5 text-xs text-text-tertiary px-3 pb-1 border-b border-border-luxury">
              <span className="col-span-2">Специалист</span>
              <span className="text-right">Начислено</span>
              <span className="text-right">Корр.</span>
              <span className="text-right">К выплате</span>
            </div>
            {mockPayouts.map((p) => {
              const diff = p.net - p.gross;
              return (
                <div key={p.id} className="grid grid-cols-5 items-center px-3 py-2.5 rounded-xl hover:bg-obsidian transition-colors">
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-text-primary">{p.specialistName}</p>
                    <p className="text-xs text-text-tertiary">{(p.rate * 100).toFixed(0)}%</p>
                  </div>
                  <p className="text-sm text-right text-text-secondary">{formatCurrency(p.gross / 100)}</p>
                  <div className="text-right">
                    {diff !== 0 && (
                      <span className={`text-xs font-medium flex items-center justify-end gap-0.5 ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatCurrency(Math.abs(diff) / 100)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-champagne">{formatCurrency(p.net / 100)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border-luxury flex justify-between items-center">
            <span className="text-sm text-text-tertiary">Итого к выплате</span>
            <span className="text-base font-semibold text-champagne">{formatCurrency(totalPending / 100)}</span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Period history */}
          <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
            <h2 className="text-base font-medium text-text-primary mb-3">Периоды</h2>
            <div className="space-y-2">
              {mockPeriods.map((period) => (
                <div key={period.id} className="flex items-center justify-between py-2 border-b border-border-luxury last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{period.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{period.specialistCount} специалистов</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">{formatCurrency(period.totalNet / 100)}</p>
                    <Badge className={`text-xs mt-1 ${PERIOD_STATUS_CONFIG[period.status as keyof typeof PERIOD_STATUS_CONFIG]?.color}`}>
                      {PERIOD_STATUS_CONFIG[period.status as keyof typeof PERIOD_STATUS_CONFIG]?.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent adjustments */}
          <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
            <h2 className="text-base font-medium text-text-primary mb-3">Корректировки</h2>
            <div className="space-y-3">
              {mockAdjustments.map((adj) => (
                <div key={adj.id} className="py-2 border-b border-border-luxury last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-text-primary">{adj.specialist}</p>
                    <span className={`text-sm font-medium ${adj.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {adj.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(adj.amount) / 100)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${ADJUSTMENT_TYPE_CONFIG[adj.type as keyof typeof ADJUSTMENT_TYPE_CONFIG]?.color}`}>
                      {ADJUSTMENT_TYPE_CONFIG[adj.type as keyof typeof ADJUSTMENT_TYPE_CONFIG]?.label}
                    </Badge>
                    <p className="text-xs text-text-tertiary truncate">{adj.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Commission rates */}
      <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
        <h2 className="text-base font-medium text-text-primary mb-4">Ставки комиссии</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {mockPayouts.map((p) => (
            <div key={p.id} className="p-3 rounded-xl bg-obsidian border border-border-luxury text-center">
              <p className="text-xs text-text-tertiary truncate mb-1">{p.specialistName.split(' ')[0]}</p>
              <p className="text-xl font-semibold text-champagne">{(p.rate * 100).toFixed(0)}%</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-text-tertiary" />
                <p className="text-xs text-text-tertiary">{formatCurrency(p.gross / 100)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
