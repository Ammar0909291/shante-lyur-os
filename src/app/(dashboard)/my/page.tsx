'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  ClipboardList,
  BookOpen,
  TrendingUp,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Loader2,
  Send,
  User,
  Banknote,
} from 'lucide-react';
import { getClientRole } from '@/lib/client-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  specialist: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    department: string;
  };
  currentMonth: {
    completedAppointments: number;
    totalCommission: number;
    totalPayable: number;
    payrollStatus: string | null;
  };
  nextBooking: {
    id: string;
    startAt: string;
    endAt: string;
    client: string;
    services: string;
    status: string;
  } | null;
  scheduleRequest: { status: string; submittedAt: string } | null;
}

interface WorkDay {
  date: string;
  isWorkDay: boolean;
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
  isVacation: boolean;
  appointmentCount: number;
}

interface Procedure {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  clientName: string;
  services: string;
  totalPrice: number;
  duration: number;
}

interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  clientName: string;
  services: string;
  totalPrice: number;
  duration: number;
}

interface SaleEntry {
  id: string;
  saleDate: string;
  services: string;
  saleTotal: number;
  commissionBasis: number;
  commissionAmount: number;
  status: string;
}

interface ScheduleDay {
  date: string;
  isWorkDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

interface ScheduleRequest {
  id: string;
  status: string;
  days: ScheduleDay[];
  note: string | null;
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB', maximumFractionDigits:0 }).format(n);
}

function monthBounds(year: number, month: number) {
  const from = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month+1, 0).getDate();
  const to = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  return { from, to };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:     { label: 'Ожидает',    cls: 'bg-amber-900/40 text-amber-300 border border-amber-700/50' },
    CONFIRMED:   { label: 'Подтверждена', cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' },
    IN_PROGRESS: { label: 'В процессе', cls: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
    COMPLETED:   { label: 'Выполнена',  cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' },
    CANCELLED:   { label: 'Отменена',   cls: 'bg-rose-900/40 text-rose-300 border border-rose-700/50' },
    NO_SHOW:     { label: 'Неявка',     cls: 'bg-red-900/40 text-red-300 border border-red-700/50' },
    RESCHEDULED: { label: 'Перенесена', cls: 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50' },
    APPROVED:    { label: 'Одобрена',   cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' },
    REJECTED:    { label: 'Отклонена',  cls: 'bg-rose-900/40 text-rose-300 border border-rose-700/50' },
    PAID:        { label: 'Оплачено',   cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-zinc-800 text-zinc-400' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (j.success) return j.data as T;
    return null;
  } catch { return null; }
}

// ─── Header Widget ─────────────────────────────────────────────────────────────

function HeaderWidget({ summary }: { summary: Summary }) {
  const { specialist, currentMonth, nextBooking } = summary;
  return (
    <div className="bg-charcoal border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {specialist.avatarUrl
            ? <img src={specialist.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <User className="w-7 h-7 text-amber-200" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-champagne truncate">{specialist.displayName}</h1>
          <p className="text-sm text-zinc-400 capitalize">{specialist.department.toLowerCase()}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-obsidian rounded-xl p-3 border border-white/5">
          <p className="text-xs text-zinc-500 mb-1">Процедур в мес.</p>
          <p className="text-2xl font-bold text-champagne">{currentMonth.completedAppointments}</p>
        </div>
        <div className="bg-obsidian rounded-xl p-3 border border-white/5">
          <p className="text-xs text-zinc-500 mb-1">Комиссия</p>
          <p className="text-2xl font-bold text-amber-400">{fmtCurrency(currentMonth.totalCommission)}</p>
        </div>
        <div className="bg-obsidian rounded-xl p-3 border border-white/5 col-span-2 sm:col-span-1">
          <p className="text-xs text-zinc-500 mb-1">К выплате</p>
          <p className="text-2xl font-bold text-emerald-400">{fmtCurrency(currentMonth.totalPayable)}</p>
          {currentMonth.payrollStatus && (
            <StatusBadge status={currentMonth.payrollStatus} />
          )}
        </div>
      </div>

      {/* Next booking */}
      {nextBooking && (
        <div className="mt-4 bg-obsidian border border-amber-700/30 rounded-xl p-4">
          <p className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Следующая запись
          </p>
          <p className="text-sm font-medium text-white">
            {fmtDate(nextBooking.startAt)} · {fmtTime(nextBooking.startAt)}–{fmtTime(nextBooking.endAt)}
          </p>
          <p className="text-sm text-zinc-300 mt-0.5">{nextBooking.client} — {nextBooking.services}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Working Days Calendar ─────────────────────────────────────────────

function WorkingDaysTab({ specialistId: _sid }: { specialistId: string }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days,  setDays]  = useState<WorkDay[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthBounds(year, month);
    const data = await apiFetch<{ days: WorkDay[] }>(`/api/v1/my/working-days?from=${from}&to=${to}`);
    setDays(data?.days ?? []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const blanks = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon-first

  const workDays = days.filter(d => d.isWorkDay).length;

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-champagne">{MONTH_RU[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} className="text-center text-xs text-zinc-500 py-1">{d}</div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {days.map((d) => {
            const date = new Date(d.date + 'T00:00:00');
            const isToday = d.date === now.toISOString().slice(0,10);
            let cellCls = 'flex flex-col items-center justify-center h-12 rounded-lg text-sm transition-colors ';
            if (d.isVacation)       cellCls += 'bg-purple-900/40 text-purple-300 border border-purple-700/30';
            else if (d.isBlocked)   cellCls += 'bg-rose-900/40 text-rose-400 border border-rose-700/30';
            else if (d.isWorkDay)   cellCls += 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/30';
            else                    cellCls += 'bg-zinc-800/40 text-zinc-500';
            if (isToday)            cellCls += ' ring-2 ring-amber-400';

            return (
              <div key={d.date} className={cellCls} title={d.isWorkDay ? `${d.startTime}–${d.endTime}` : undefined}>
                <span className="font-medium">{date.getDate()}</span>
                {d.isWorkDay && d.appointmentCount > 0 && (
                  <span className="text-xs opacity-70">{d.appointmentCount}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-800/60 border border-emerald-700/50" />Рабочий ({workDays})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-700/60" />Выходной</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-800/60 border border-rose-700/50" />Блок</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-800/60 border border-purple-700/50" />Отпуск</span>
      </div>
    </div>
  );
}

// ─── Tab 2: Procedures ────────────────────────────────────────────────────────

function ProceduresTab() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthBounds(year, month);
    const data = await apiFetch<{ procedures: Procedure[]; pagination: { total: number } }>(
      `/api/v1/my/procedures?from=${from}&to=${to}&page=${page}&limit=${limit}`
    );
    setProcedures(data?.procedures ?? []);
    setTotal(data?.pagination.total ?? 0);
    setLoading(false);
  }, [year, month, page]);

  useEffect(() => { setPage(1); }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-champagne">{MONTH_RU[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
      ) : procedures.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">Нет процедур за этот период</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-white/10">
                <th className="pb-2 pr-4 font-medium">Дата</th>
                <th className="pb-2 pr-4 font-medium">Клиент</th>
                <th className="pb-2 pr-4 font-medium">Услуги</th>
                <th className="pb-2 pr-4 font-medium">Статус</th>
                <th className="pb-2 text-right font-medium">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {procedures.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap">
                    {fmtDate(p.startAt)} {fmtTime(p.startAt)}
                  </td>
                  <td className="py-3 pr-4 text-zinc-200">{p.clientName}</td>
                  <td className="py-3 pr-4 text-zinc-400 max-w-[200px] truncate" title={p.services}>{p.services}</td>
                  <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
                  <td className="py-3 text-right text-amber-300 whitespace-nowrap">{fmtCurrency(p.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
          <span>{total} всего</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-40 hover:bg-white/10 transition-colors">
              ←
            </button>
            <span className="px-2 py-1">{page} / {Math.ceil(total / limit)}</span>
            <button disabled={page * limit >= total} onClick={() => setPage(p => p+1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-40 hover:bg-white/10 transition-colors">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: My Bookings ───────────────────────────────────────────────────────

function BookingsTab() {
  const [data, setData] = useState<{ upcoming: Booking[]; recent: Booking[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ upcoming: Booking[]; recent: Booking[] }>('/api/v1/my/bookings/upcoming?limit=8')
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  function BookingCard({ b }: { b: Booking }) {
    return (
      <div className="bg-obsidian border border-white/10 rounded-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-900/30 border border-amber-700/30 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-amber-300">{new Date(b.startAt).getDate()}</span>
          <span className="text-[10px] text-amber-400/70">{MONTH_RU[new Date(b.startAt).getMonth()].slice(0,3)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-white truncate">{b.clientName}</span>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-xs text-zinc-400 truncate">{b.services}</p>
          <p className="text-xs text-zinc-500 mt-1">{fmtTime(b.startAt)}–{fmtTime(b.endAt)} · {b.duration} мин</p>
        </div>
        <span className="text-sm text-amber-300 whitespace-nowrap">{fmtCurrency(b.totalPrice)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Предстоящие</h3>
        {data?.upcoming.length === 0
          ? <p className="text-zinc-500 text-sm py-4">Нет предстоящих записей</p>
          : <div className="space-y-2">{data?.upcoming.map(b => <BookingCard key={b.id} b={b} />)}</div>
        }
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Последние</h3>
        {data?.recent.length === 0
          ? <p className="text-zinc-500 text-sm py-4">Нет последних записей</p>
          : <div className="space-y-2">{data?.recent.map(b => <BookingCard key={b.id} b={b} />)}</div>
        }
      </div>
    </div>
  );
}

// ─── Tab 4: Sales & Commissions ───────────────────────────────────────────────

function SalesTab() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sales,    setSales]    = useState<SaleEntry[]>([]);
  const [summary,  setSummary]  = useState<{ totalCommission: number } | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthBounds(year, month);
    const data = await apiFetch<{ sales: SaleEntry[]; pagination: { total: number }; summary: { totalCommission: number } }>(
      `/api/v1/my/sales?from=${from}&to=${to}&page=${page}&limit=${limit}`
    );
    setSales(data?.sales ?? []);
    setTotal(data?.pagination.total ?? 0);
    setSummary(data?.summary ?? null);
    setLoading(false);
  }, [year, month, page]);

  useEffect(() => { setPage(1); }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-champagne">{MONTH_RU[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {summary && (
        <div className="mb-4 bg-obsidian border border-amber-700/30 rounded-xl p-4 flex items-center gap-3">
          <Banknote className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-zinc-400">Итого комиссия за месяц</p>
            <p className="text-xl font-bold text-amber-400">{fmtCurrency(summary.totalCommission)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
      ) : sales.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">Нет продаж за этот период</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-white/10">
                <th className="pb-2 pr-4 font-medium">Дата</th>
                <th className="pb-2 pr-4 font-medium">Услуги</th>
                <th className="pb-2 pr-4 font-medium text-right">Продажа</th>
                <th className="pb-2 pr-4 font-medium text-right">Ставка</th>
                <th className="pb-2 text-right font-medium">Комиссия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap">{fmtDate(s.saleDate)}</td>
                  <td className="py-3 pr-4 text-zinc-400 max-w-[200px] truncate" title={s.services}>{s.services}</td>
                  <td className="py-3 pr-4 text-right text-zinc-300 whitespace-nowrap">{fmtCurrency(s.saleTotal)}</td>
                  <td className="py-3 pr-4 text-right text-zinc-400">{Number(s.commissionBasis).toFixed(1)}%</td>
                  <td className="py-3 text-right text-amber-300 font-medium whitespace-nowrap">{fmtCurrency(s.commissionAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
          <span>{total} всего</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-40 hover:bg-white/10 transition-colors">←</button>
            <span className="px-2 py-1">{page} / {Math.ceil(total / limit)}</span>
            <button disabled={page * limit >= total} onClick={() => setPage(p => p+1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-40 hover:bg-white/10 transition-colors">→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Schedule Builder ──────────────────────────────────────────────────

// Returns the next N upcoming months as YYYY-MM strings (starting from next month)
function upcomingMonths(count = 4): string[] {
  const result: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 2; // +1 = current month (1-indexed), +2 = next month
  if (m > 12) { m = 1; y++; }
  for (let i = 0; i < count; i++) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

function buildEmptyDays(monthStr: string): ScheduleDay[] {
  const [y, m] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate(); // m = 1-indexed, so new Date(y, m, 0) = last day of month m
  const days: ScheduleDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    // Build string directly — never use toISOString() which shifts by timezone offset
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date, isWorkDay: false, startTime: null, endTime: null });
  }
  return days;
}

function MonthSchedule({ monthStr }: { monthStr: string }) {
  const [y, m] = monthStr.split('-').map(Number);
  const monthIdx = m - 1; // 0-indexed for MONTH_RU

  const [request,    setRequest]    = useState<ScheduleRequest | null | undefined>(undefined);
  const [days,       setDays]       = useState<ScheduleDay[]>([]);
  const [note,       setNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    setRequest(undefined);
    setError('');
    setSuccess(false);
    apiFetch<{ month: string; request: ScheduleRequest | null }>(
      `/api/v1/my/schedule/next?month=${monthStr}`
    ).then((data) => {
      setRequest(data?.request ?? null);
      setDays(data?.request ? (data.request.days ?? []) : buildEmptyDays(monthStr));
    });
  }, [monthStr]);

  function toggleDay(date: string) {
    setDays(prev => prev.map(d => {
      if (d.date !== date) return d;
      const isWork = !d.isWorkDay;
      return { ...d, isWorkDay: isWork, startTime: isWork ? '10:00' : null, endTime: isWork ? '20:00' : null };
    }));
  }

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/my/schedule/next', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month: monthStr, days, note }),
      });
      const json = await res.json();
      if (json.success) {
        // Reload the request state
        const refreshed = await apiFetch<{ month: string; request: ScheduleRequest | null }>(
          `/api/v1/my/schedule/next?month=${monthStr}`
        );
        setRequest(refreshed?.request ?? null);
        setSuccess(true);
      } else {
        setError(json.error?.message ?? 'Ошибка при отправке');
      }
    } catch {
      setError('Ошибка сети');
    }
    setSubmitting(false);
  }

  if (request === undefined) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-amber-400" /></div>;
  }

  const firstDow = new Date(y, monthIdx, 1).getDay();
  const blanks   = firstDow === 0 ? 6 : firstDow - 1;

  // ── Read-only view (PENDING or APPROVED — locked) ──
  if (request && request.status !== 'REJECTED') {
    return (
      <div>
        <div className={`mb-4 rounded-xl p-4 border flex items-start gap-3 ${
          request.status === 'APPROVED' ? 'bg-emerald-900/30 border-emerald-700/40' :
          request.status === 'REJECTED' ? 'bg-rose-900/30 border-rose-700/40' :
          'bg-amber-900/30 border-amber-700/40'
        }`}>
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">
              <StatusBadge status={request.status} /> · Подан {fmtDate(request.submittedAt)}
            </p>
            <p className="text-xs text-zinc-500">Изменения возможны только через администратора.</p>
            {request.reviewNotes && (
              <p className="mt-2 text-sm text-zinc-300 bg-black/20 rounded p-2">{request.reviewNotes}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
            <div key={d} className="text-center text-xs text-zinc-500 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
          {request.days.map((d) => {
            const dt = new Date(d.date + 'T00:00:00');
            return (
              <div key={d.date}
                className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                  d.isWorkDay
                    ? 'bg-emerald-900/40 border border-emerald-700/30 text-emerald-300'
                    : 'bg-zinc-800/40 text-zinc-600'
                }`}
              >
                {dt.getDate()}
              </div>
            );
          })}
        </div>

        {request.note && (
          <div className="mt-3 bg-obsidian rounded-xl p-3 border border-white/10">
            <p className="text-xs text-zinc-500 mb-1">Примечание</p>
            <p className="text-sm text-zinc-300">{request.note}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Submission form ──
  const workDays = days.filter(d => d.isWorkDay).length;

  return (
    <div>
      {/* Rejection banner — shown when resubmitting after a rejection */}
      {request?.status === 'REJECTED' && !success && (
        <div className="mb-4 bg-rose-900/30 border border-rose-700/40 rounded-xl p-4">
          <p className="text-sm font-semibold text-rose-300 mb-0.5">График отклонён — скорректируйте и подайте повторно</p>
          {request.reviewNotes && (
            <p className="text-xs text-rose-400/80 mt-1">Причина: {request.reviewNotes}</p>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-500 mb-3">
        Нажмите на день чтобы отметить рабочим · часы работы 10:00–20:00 · {workDays} {workDays === 1 ? 'день' : workDays < 5 ? 'дня' : 'дней'} выбрано
      </p>

      {success && (
        <div className="mb-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">{request?.status === 'REJECTED' ? 'График повторно подан!' : 'График подан!'} Ожидайте подтверждения администратора.</p>
        </div>
      )}
      {error && (
        <div className="mb-3 bg-rose-900/30 border border-rose-700/40 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} className="text-center text-xs text-zinc-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const dt = new Date(d.date + 'T00:00:00');
          return (
            <button
              key={d.date}
              onClick={() => toggleDay(d.date)}
              className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                d.isWorkDay
                  ? 'bg-emerald-900/50 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/60'
                  : 'bg-zinc-800/50 border border-zinc-700/20 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300'
              }`}
            >
              {dt.getDate()}
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Примечание (необязательно)..."
        rows={2}
        className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none mb-4"
      />

      <button
        onClick={submit}
        disabled={submitting || workDays === 0}
        className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors text-sm"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Подать график на {MONTH_RU[monthIdx]}
      </button>
    </div>
  );
}

function ScheduleTab() {
  const months = upcomingMonths(4);
  const [selectedMonth, setSelectedMonth] = useState(months[0]);

  return (
    <div>
      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {months.map((ms) => {
          const [y, m] = ms.split('-').map(Number);
          const active = ms === selectedMonth;
          return (
            <button
              key={ms}
              onClick={() => setSelectedMonth(ms)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-600 text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {MONTH_RU[m - 1]} {y}
            </button>
          );
        })}
      </div>

      <MonthSchedule key={selectedMonth} monthStr={selectedMonth} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'working-days', label: 'Рабочие дни',           icon: Calendar },
  { id: 'procedures',   label: 'Процедуры',              icon: ClipboardList },
  { id: 'bookings',     label: 'Мои записи',             icon: BookOpen },
  { id: 'sales',        label: 'Продажи и комиссии',     icon: TrendingUp },
  { id: 'schedule',     label: 'График на след. месяц',  icon: CalendarRange },
];

export default function MyPortalPage() {
  const [summary,    setSummary]    = useState<Summary | null>(null);
  const [activeTab,  setActiveTab]  = useState('working-days');
  const [loading,    setLoading]    = useState(true);

  const role = getClientRole();
  const isReceptionist = role === 'RECEPTIONIST';

  useEffect(() => {
    apiFetch<Summary>('/api/v1/my/summary').then(d => {
      setSummary(d);
      setLoading(false);
    });
  }, []);

  const visibleTabs = TABS.filter(t => {
    if (t.id === 'sales' && isReceptionist) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-zinc-300">Не удалось загрузить данные кабинета.</p>
          <p className="text-zinc-500 text-sm mt-1">Убедитесь, что вы зарегистрированы как специалист.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <HeaderWidget summary={summary} />

        {/* Tabs */}
        <div className="bg-charcoal border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex overflow-x-auto border-b border-white/10 scrollbar-hide">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                    active
                      ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {activeTab === 'working-days' && <WorkingDaysTab specialistId={summary.specialist.id} />}
            {activeTab === 'procedures'   && <ProceduresTab />}
            {activeTab === 'bookings'     && <BookingsTab />}
            {activeTab === 'sales'        && !isReceptionist && <SalesTab />}
            {activeTab === 'schedule'     && <ScheduleTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
