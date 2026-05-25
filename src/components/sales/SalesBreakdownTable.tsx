'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type {
  SalesBreakdownResponse,
  SalesEmployeeRow,
  SalesServiceRow,
  SalesBreakdownQuery,
} from '@/modules/sales/domain/sales.dto';

type View    = 'employee' | 'service';
type SortBy  = SalesBreakdownQuery['sortBy'];
type SortDir = 'asc' | 'desc';

interface SalesBreakdownTableProps {
  data:      SalesBreakdownResponse | null;
  loading:   boolean;
  view:      View;
  onView:    (v: View) => void;
  sortBy:    SortBy;
  sortOrder: SortDir;
  onSort:    (col: SortBy) => void;
  page:      number;
  onPage:    (p: number) => void;
  className?: string;
}

const R = (n: number) => `₽${n.toLocaleString('ru-RU')}`;
const N = (n: number) => n.toLocaleString('ru-RU');

function Th({
  col, label, current, dir, onSort,
}: {
  col: SortBy; label: string; current: SortBy; dir: SortDir; onSort: (c: SortBy) => void;
}) {
  const active = current === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-4 py-3 text-left text-xs font-medium text-text-muted cursor-pointer hover:text-text-secondary select-none whitespace-nowrap transition-colors"
    >
      <span className="flex items-center gap-1">
        {label}
        {active && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d={dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
            />
          </svg>
        )}
      </span>
    </th>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <tr key={i} className="border-t border-border-luxury/40">
          {Array.from({ length: cols }, (_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-border-luxury rounded animate-pulse" style={{ width: j === 0 ? '60%' : '40%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmployeeTable({
  items, totals, sortBy, sortOrder, onSort, loading,
}: {
  items:     SalesEmployeeRow[];
  totals:    SalesBreakdownResponse['totals'] | undefined;
  sortBy:    SortBy;
  sortOrder: SortDir;
  onSort:    (c: SortBy) => void;
  loading:   boolean;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-obsidian/40">
        <tr>
          <Th col="name"        label="Сотрудник"    current={sortBy} dir={sortOrder} onSort={onSort} />
          <Th col="bookings"    label="Записей"      current={sortBy} dir={sortOrder} onSort={onSort} />
          <Th col="revenue"     label="Выручка"      current={sortBy} dir={sortOrder} onSort={onSort} />
          <Th col="avgTicket"   label="Средний чек"  current={sortBy} dir={sortOrder} onSort={onSort} />
          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Топ услуга</th>
          <Th col="cancellations" label="Отмены"     current={sortBy} dir={sortOrder} onSort={onSort} />
          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Комиссия</th>
        </tr>
      </thead>
      <tbody>
        {loading && <SkeletonRows cols={7} />}
        {!loading && items.map((row) => (
          <tr key={row.id} className="border-t border-border-luxury/40 hover:bg-charcoal/60 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-text-primary">{row.name}</span>
            </td>
            <td className="px-4 py-3 text-text-secondary">{N(row.bookings)}</td>
            <td className="px-4 py-3 text-champagne font-medium">{R(row.revenue)}</td>
            <td className="px-4 py-3 text-text-secondary">{R(row.avgTicket)}</td>
            <td className="px-4 py-3 text-text-muted text-xs truncate max-w-[140px]">{row.topService ?? '—'}</td>
            <td className="px-4 py-3 text-text-secondary">{N(row.cancellations)}</td>
            <td className="px-4 py-3 text-text-secondary">
              {row.commissionEarned !== null ? R(row.commissionEarned) : '—'}
            </td>
          </tr>
        ))}
        {!loading && totals != null && (
          <tr className="border-t-2 border-border-luxury bg-obsidian/20 font-semibold">
            <td className="px-4 py-3 text-text-secondary text-xs">Итого</td>
            <td className="px-4 py-3 text-text-primary">{N(totals.bookings)}</td>
            <td className="px-4 py-3 text-champagne">{R(totals.revenue)}</td>
            <td colSpan={4} />
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ServiceTable({
  items, totals, sortBy, sortOrder, onSort, loading,
}: {
  items:     SalesServiceRow[];
  totals:    SalesBreakdownResponse['totals'] | undefined;
  sortBy:    SortBy;
  sortOrder: SortDir;
  onSort:    (c: SortBy) => void;
  loading:   boolean;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-obsidian/40">
        <tr>
          <Th col="name"        label="Услуга"       current={sortBy} dir={sortOrder} onSort={onSort} />
          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Категория</th>
          <Th col="bookings"    label="Записей"      current={sortBy} dir={sortOrder} onSort={onSort} />
          <Th col="revenue"     label="Выручка"      current={sortBy} dir={sortOrder} onSort={onSort} />
          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Ср. длительность</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Топ мастер</th>
          <Th col="cancellations" label="Отмены"     current={sortBy} dir={sortOrder} onSort={onSort} />
        </tr>
      </thead>
      <tbody>
        {loading && <SkeletonRows cols={7} />}
        {!loading && items.map((row) => (
          <tr key={row.id} className="border-t border-border-luxury/40 hover:bg-charcoal/60 transition-colors">
            <td className="px-4 py-3 font-medium text-text-primary">{row.name}</td>
            <td className="px-4 py-3 text-text-muted text-xs">{row.category}</td>
            <td className="px-4 py-3 text-text-secondary">{N(row.bookings)}</td>
            <td className="px-4 py-3 text-champagne font-medium">{R(row.revenue)}</td>
            <td className="px-4 py-3 text-text-secondary">{row.avgDuration}м</td>
            <td className="px-4 py-3 text-text-muted text-xs truncate max-w-[140px]">{row.topEmployee ?? '—'}</td>
            <td className="px-4 py-3 text-text-secondary">{N(row.cancellations)}</td>
          </tr>
        ))}
        {!loading && totals != null && (
          <tr className="border-t-2 border-border-luxury bg-obsidian/20 font-semibold">
            <td colSpan={2} className="px-4 py-3 text-text-secondary text-xs">Итого</td>
            <td className="px-4 py-3 text-text-primary">{N(totals.bookings)}</td>
            <td className="px-4 py-3 text-champagne">{R(totals.revenue)}</td>
            <td colSpan={3} />
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-luxury/40">
      <p className="text-xs text-text-muted">
        Стр. {page} из {totalPages} · {total} строк
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ←
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={cn(
              'w-7 h-7 rounded text-xs font-medium transition-all',
              p === page
                ? 'bg-champagne/20 text-champagne'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}

export function SalesBreakdownTable({
  data, loading, view, onView, sortBy, sortOrder, onSort, page, onPage, className,
}: SalesBreakdownTableProps) {
  const employeeItems = (data?.items ?? []).filter((r): r is SalesEmployeeRow => r.view === 'employee');
  const serviceItems  = (data?.items ?? []).filter((r): r is SalesServiceRow  => r.view === 'service');

  return (
    <div className={cn('bg-charcoal border border-border-luxury rounded-2xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-luxury">
        <h3 className="text-sm font-medium text-text-primary">Детализация</h3>
        <div className="flex gap-1 bg-obsidian/40 rounded-lg p-0.5">
          {(['employee', 'service'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                view === v
                  ? 'bg-charcoal text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {v === 'employee' ? 'Сотрудники' : 'Услуги'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {view === 'employee' ? (
          <EmployeeTable
            items={employeeItems}
            totals={data?.totals}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
            loading={loading}
          />
        ) : (
          <ServiceTable
            items={serviceItems}
            totals={data?.totals}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
            loading={loading}
          />
        )}
      </div>

      {data && (
        <Pagination
          page={page}
          total={data.total}
          limit={data.limit}
          onPage={onPage}
        />
      )}
    </div>
  );
}
