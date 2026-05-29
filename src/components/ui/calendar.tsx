'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

function getMonthNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1))
      .replace(/^./, (c) => c.toUpperCase())
  );
}

function getWeekdayNames(locale: string): string[] {
  // Monday-first: Mon=1..Sun=0 → reorder to Mon..Sun
  const days = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2000, 0, 3 + i))
  );
  return days;
}

interface CalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: Date;
}

type CellMonth = 'prev' | 'curr' | 'next';

interface Cell {
  day: number;
  month: CellMonth;
  date: Date;
}

export function Calendar({ value, onChange, minDate }: CalendarProps) {
  const { lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const MONTHS = getMonthNames(locale);
  const WEEKDAYS = getWeekdayNames(locale);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = value ? (() => { const d = new Date(value + 'T12:00:00'); d.setHours(0,0,0,0); return d; })() : null;

  const [viewYear, setViewYear] = React.useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selected?.getMonth() ?? today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  // Monday-based offset: Sun=0 → offset 6, Mon=1 → offset 0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const cells: Cell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    cells.push({ day: d, month: 'prev', date: new Date(viewYear, viewMonth - 1, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: 'curr', date: new Date(viewYear, viewMonth, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: 'next', date: new Date(viewYear, viewMonth + 1, d) });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const isDisabled = (d: Date) => {
    const copy = new Date(d); copy.setHours(0,0,0,0);
    return !!minDate && copy < minDate;
  };

  const select = (cell: Cell) => {
    if (isDisabled(cell.date)) return;
    const y = cell.date.getFullYear();
    const m = String(cell.date.getMonth() + 1).padStart(2, '0');
    const d = String(cell.date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    if (cell.month === 'prev') prevMonth();
    else if (cell.month === 'next') nextMonth();
  };

  return (
    <div className="p-3 w-full select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
          aria-label={lang === 'en' ? 'Previous month' : 'Предыдущий месяц'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-text-primary">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
          aria-label={lang === 'en' ? 'Next month' : 'Следующий месяц'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-text-tertiary py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell, i) => {
          const sel = !!selected && isSameDay(cell.date, selected);
          const tod = isSameDay(cell.date, today);
          const dis = isDisabled(cell.date);
          const other = cell.month !== 'curr';
          return (
            <button
              key={i}
              type="button"
              onClick={() => select(cell)}
              disabled={dis}
              className={cn(
                'h-8 flex items-center justify-center text-sm rounded-lg transition-all',
                dis && 'opacity-25 cursor-not-allowed',
                !dis && !sel && 'hover:bg-charcoal cursor-pointer',
                sel && 'bg-champagne text-obsidian font-semibold shadow-sm',
                tod && !sel && 'text-champagne font-semibold',
                other && !sel && !tod && 'text-text-tertiary',
                !other && !sel && !tod && !dis && 'text-text-primary',
              )}
              aria-label={`${cell.date.getDate()} ${MONTHS[cell.date.getMonth()]} ${cell.date.getFullYear()}`}
              aria-pressed={sel}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
