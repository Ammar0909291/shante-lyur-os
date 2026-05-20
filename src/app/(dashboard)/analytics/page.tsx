'use client';

import * as React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Calendar, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n-context';
import * as XLSX from 'xlsx';

const periods = [
  { value: '2025-05', label: 'Май 2025' },
  { value: '2025-04', label: 'Апрель 2025' },
  { value: '2025-03', label: 'Март 2025' },
];

const defaultKpi = [
  { title: 'Выручка за май', value: formatCurrency(48200000), change: '+14%', positive: true, subtitle: 'vs апрель', icon: TrendingUp },
  { title: 'Записей за май', value: '312', change: '+8%', positive: true, subtitle: 'vs апрель', icon: Calendar },
  { title: 'Новых клиентов', value: '47', change: '-3%', positive: false, subtitle: 'vs апрель', icon: Users },
  { title: 'Средний чек', value: formatCurrency(154500), change: '+6%', positive: true, subtitle: 'vs апрель', icon: TrendingUp },
];

const revenueByWeek = [
  { week: 'Нед. 1', revenue: 10800000, appointments: 68 },
  { week: 'Нед. 2', revenue: 12400000, appointments: 78 },
  { week: 'Нед. 3', revenue: 13200000, appointments: 84 },
  { week: 'Нед. 4', revenue: 11800000, appointments: 82 },
];

const topServices = [
  { name: 'Лазерная эпиляция', revenue: 10050000, share: 21 },
  { name: 'Биоревитализация', revenue: 8280000, share: 17 },
  { name: 'Контурная пластика', revenue: 7920000, share: 16 },
  { name: 'Гиалуроновый лифтинг', revenue: 6480000, share: 13 },
  { name: 'Нейромышечный массаж', revenue: 5400000, share: 11 },
];

const topSpecialists = [
  { name: 'Наталья Васильева', revenue: 14200000, appointments: 71 },
  { name: 'Мария Петрова', revenue: 13600000, appointments: 68 },
  { name: 'Ольга Козлова', revenue: 11400000, appointments: 54 },
  { name: 'Дарья Смирнова', revenue: 9000000, appointments: 42 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState('2025-05');
  const [weekData, setWeekData] = React.useState(revenueByWeek);
  const maxRevenue = Math.max(...weekData.map((w) => w.revenue));
  const t = useT();

  React.useEffect(() => {
    const [year, month] = period.split('-');
    apiGet<{ data: typeof revenueByWeek }>(`/api/admin/revenue?year=${year}&month=${month}`)
      .then((res) => { if (res.data?.length) setWeekData(res.data); })
      .catch(() => setWeekData(revenueByWeek));
  }, [period]);

  function handleExport() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Неделя', 'Выручка (₽)', 'Записей'],
      ...weekData.map((w) => [w.week, (w.revenue / 100).toFixed(2), w.appointments]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Аналитика');
    XLSX.writeFile(wb, `analytics-${period}.xlsx`);
    toast.success('Файл загружен');
  }

  const periodLabel = periods.find((p) => p.value === period)?.label ?? period;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('page.analytics')}</h2>
          <p className="text-text-secondary mt-1 text-sm">Показатели студии — {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-charcoal border border-border-luxury rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-champagne/40"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>
            {t('btn.export')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {defaultKpi.map(({ title, value, change, positive, subtitle, icon: Icon }) => (
          <div key={title} className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-text-tertiary">{title}</p>
                <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-champagne/8 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-champagne" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {positive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className={`text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{change}</span>
              <span className="text-xs text-text-tertiary">{subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-onyx border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-champagne" />
            <h3 className="font-serif text-base font-medium text-text-primary">Выручка по неделям</h3>
          </div>
          <div className="flex items-end gap-4 h-40">
            {weekData.map((week) => {
              const heightPct = maxRevenue > 0 ? Math.round((week.revenue / maxRevenue) * 100) : 0;
              return (
                <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-text-tertiary">{formatCurrency(week.revenue)}</span>
                  <div
                    className="w-full rounded-t-lg luxury-gradient opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-center">
                    <p className="text-xs font-medium text-text-secondary">{week.week}</p>
                    <p className="text-[10px] text-text-tertiary">{week.appointments} зап.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
          <h3 className="font-serif text-base font-medium text-text-primary mb-4">Топ специалистов</h3>
          <div className="space-y-3">
            {topSpecialists.map((spec, i) => (
              <div key={spec.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-champagne/10 text-champagne text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{spec.name}</p>
                  <p className="text-[10px] text-text-tertiary">{spec.appointments} записей</p>
                </div>
                <span className="text-xs font-semibold text-champagne shrink-0">{formatCurrency(spec.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
        <h3 className="font-serif text-base font-medium text-text-primary mb-4">Топ услуг по выручке</h3>
        <div className="space-y-3">
          {topServices.map((service) => (
            <div key={service.name} className="flex items-center gap-4">
              <span className="text-xs text-text-secondary w-40 shrink-0 truncate">{service.name}</span>
              <div className="flex-1 bg-charcoal rounded-full h-2 overflow-hidden">
                <div className="h-full luxury-gradient rounded-full" style={{ width: `${service.share}%` }} />
              </div>
              <span className="text-xs text-text-tertiary w-8 text-right shrink-0">{service.share}%</span>
              <span className="text-xs font-medium text-text-primary w-24 text-right shrink-0">{formatCurrency(service.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
