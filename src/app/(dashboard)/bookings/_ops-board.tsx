'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Clock, AlertTriangle, X, Check, Play, UserCheck,
  Ban, RefreshCw, LayoutGrid, Rows, Grid3X3, Wifi, WifiOff,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type {
  TodayOperationsResponse,
  OperationalAppointment,
  OperationalStatus,
  LiveSpecialist,
  RoomStatus,
  TransitionAction,
} from '@/types/operations';

// ── Grid constants ─────────────────────────────────────────────────────────────
const DAY_START_HOUR = 10;
const DAY_END_HOUR = 20;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 48;           // px per 15-min slot
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES; // 40
const TOTAL_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT;                             // 1920px
const PX_PER_MIN = SLOT_HEIGHT / SLOT_MINUTES;                              // 3.2
const TIME_COL_W = 72;
const SPEC_COL_W = 210;
const TIMEZONE = 'Asia/Yekaterinburg';
const REFRESH_INTERVAL_MS = 45_000;

// ── Time helpers ───────────────────────────────────────────────────────────────
function isoToLocalMinutes(iso: string): number {
  const d = new Date(iso);
  const local = new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return local.getHours() * 60 + local.getMinutes();
}

function minutesToY(minutesFromMidnight: number): number {
  return (minutesFromMidnight - DAY_START_HOUR * 60) * PX_PER_MIN;
}

function currentTimeY(): number {
  return minutesToY(isoToLocalMinutes(new Date().toISOString()));
}

function durationToHeight(minutes: number): number {
  return Math.max(minutes * PX_PER_MIN, 28);
}

function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit',
  });
}

function formatLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    timeZone: TIMEZONE, day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
  });
}

// ── Status config (luxury color palette) ──────────────────────────────────────
const STATUS_CFG: Record<OperationalStatus, {
  bg: string; border: string; text: string; dotColor: string; label: string;
}> = {
  PENDING:     { bg: 'bg-amber-900/30',  border: 'border-amber-600/50',  text: 'text-amber-200',   dotColor: 'bg-amber-400',  label: 'Ожидает' },
  CONFIRMED:   { bg: 'bg-yellow-900/35', border: 'border-yellow-500/55', text: 'text-yellow-100',  dotColor: 'bg-yellow-400', label: 'Подтверждён' },
  ARRIVED:     { bg: 'bg-yellow-800/45', border: 'border-yellow-400/70', text: 'text-yellow-50',   dotColor: 'bg-yellow-300', label: 'Прибыл' },
  WAITING:     { bg: 'bg-orange-900/35', border: 'border-orange-500/55', text: 'text-orange-200',  dotColor: 'bg-orange-400', label: 'В очереди' },
  IN_PROGRESS: { bg: 'bg-emerald-900/35',border: 'border-emerald-500/55',text: 'text-emerald-100', dotColor: 'bg-emerald-400',label: 'В работе' },
  COMPLETED:   { bg: 'bg-zinc-800/50',   border: 'border-zinc-600/35',   text: 'text-zinc-400',    dotColor: 'bg-zinc-500',   label: 'Завершён' },
  CANCELLED:   { bg: 'bg-red-950/40',    border: 'border-red-700/40',    text: 'text-red-400',     dotColor: 'bg-red-500',    label: 'Отменён' },
  NO_SHOW:     { bg: 'bg-zinc-900/45',   border: 'border-zinc-700/30',   text: 'text-zinc-500',    dotColor: 'bg-zinc-600',   label: 'Не явился' },
  RESCHEDULED: { bg: 'bg-blue-900/30',   border: 'border-blue-600/40',   text: 'text-blue-300',    dotColor: 'bg-blue-400',   label: 'Перенесён' },
};

const DEPT_COLOR: Record<string, string> = {
  COSMETOLOGY: 'text-rose-300',
  MASSAGE:     'text-indigo-300',
  RECEPTION:   'text-sky-300',
  MANAGEMENT:  'text-amber-300',
};

const DEPT_LABEL: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE:     'Массаж',
  RECEPTION:   'Ресепшн',
  MANAGEMENT:  'Менеджмент',
};

// ── Conflict detection ─────────────────────────────────────────────────────────
function detectConflicts(apts: OperationalAppointment[]): Set<string> {
  const conflicted = new Set<string>();
  const active = apts.filter(a => !['CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(a.dbStatus));
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const overlap =
        (a.specialistId === b.specialistId || (a.roomId && a.roomId === b.roomId)) &&
        new Date(a.startAt) < new Date(b.endAt) &&
        new Date(b.startAt) < new Date(a.endAt);
      if (overlap) { conflicted.add(a.id); conflicted.add(b.id); }
    }
  }
  return conflicted;
}

// ── Allowed actions per status ─────────────────────────────────────────────────
function allowedActions(status: OperationalStatus): TransitionAction[] {
  switch (status) {
    case 'PENDING':     return ['confirm', 'checkin', 'start', 'noshow', 'cancel'];
    case 'CONFIRMED':   return ['checkin', 'start', 'noshow', 'cancel'];
    case 'ARRIVED':     return ['start', 'cancel'];
    case 'WAITING':     return ['start', 'cancel'];
    case 'IN_PROGRESS': return ['complete', 'cancel'];
    default:            return [];
  }
}

// ── View modes ─────────────────────────────────────────────────────────────────
type ViewMode = 'day' | 'room' | 'compact';

// ── Filters ────────────────────────────────────────────────────────────────────
interface BoardFilters {
  department: string;
  specialistId: string;
  roomId: string;
  status: string;
}

// ── AppointmentBlock component ─────────────────────────────────────────────────
interface BlockProps {
  apt: OperationalAppointment;
  colWidth: number;
  isConflict: boolean;
  onClick: (apt: OperationalAppointment) => void;
}

const AppointmentBlock = React.memo(function AppointmentBlock({ apt, colWidth, isConflict, onClick }: BlockProps) {
  const startMin = isoToLocalMinutes(apt.startAt);
  if (startMin < DAY_START_HOUR * 60 || startMin >= DAY_END_HOUR * 60) return null;

  const top    = minutesToY(startMin);
  const height = durationToHeight(apt.duration);
  const cfg    = STATUS_CFG[apt.operationalStatus] ?? STATUS_CFG.PENDING;
  const isPaid = apt.paymentStatus === 'PAID';
  const isShort = height < 64;

  return (
    <button
      onClick={() => onClick(apt)}
      className={cn(
        'absolute left-1 right-1 rounded-lg border overflow-hidden text-left transition-all',
        'hover:scale-[1.02] hover:z-20 active:scale-100 focus:outline-none focus:ring-1 focus:ring-champagne/40',
        cfg.bg, cfg.border, cfg.text,
        isConflict && 'ring-2 ring-red-500/70',
      )}
      style={{ top, height: height - 2, width: colWidth - 10, zIndex: 5 }}
      title={`${apt.clientName} · ${apt.services[0] ?? ''} · ${formatLocalTime(apt.startAt)}`}
    >
      <div className="px-2 py-1.5 h-full flex flex-col gap-0.5">
        {/* Status dot + time */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dotColor)} />
          <span className="text-[10px] font-mono opacity-75 leading-none">
            {formatLocalTime(apt.startAt)}
          </span>
          {isPaid && !isShort && (
            <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-300 rounded px-1 leading-tight">✓</span>
          )}
          {isConflict && (
            <AlertTriangle className="ml-auto w-3 h-3 text-red-400 flex-shrink-0" />
          )}
        </div>
        {/* Client name */}
        <p className="text-xs font-medium leading-tight truncate flex-shrink-0">
          {apt.clientName}
        </p>
        {/* Service name */}
        {!isShort && apt.services[0] && (
          <p className="text-[10px] opacity-60 leading-tight truncate">
            {apt.services[0]}
          </p>
        )}
        {/* Duration + room */}
        {height >= 88 && (
          <div className="flex items-center gap-1 mt-auto opacity-55 flex-shrink-0">
            <span className="text-[9px]">{apt.duration} мин</span>
            {apt.roomName && (
              <>
                <span className="text-[9px]">·</span>
                <span className="text-[9px]">{apt.roomName}</span>
              </>
            )}
          </div>
        )}
      </div>
    </button>
  );
});

// ── QuickActionModal ───────────────────────────────────────────────────────────
interface ModalProps {
  apt: OperationalAppointment;
  onClose: () => void;
  onAction: (id: string, action: TransitionAction) => Promise<void>;
  actionLoading: boolean;
}

function QuickActionModal({ apt, onClose, onAction, actionLoading }: ModalProps) {
  const cfg    = STATUS_CFG[apt.operationalStatus] ?? STATUS_CFG.PENDING;
  const actions = allowedActions(apt.operationalStatus);

  const ACTION_UI: Record<TransitionAction, { label: string; icon: React.ReactNode; variant: string }> = {
    confirm:  { label: 'Подтвердить',    icon: <Check className="w-4 h-4" />,     variant: 'bg-yellow-600 hover:bg-yellow-500 text-white' },
    checkin:  { label: 'Отметить приход', icon: <UserCheck className="w-4 h-4" />, variant: 'bg-emerald-700 hover:bg-emerald-600 text-white' },
    start:    { label: 'Начать процедуру',icon: <Play className="w-4 h-4" />,      variant: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
    complete: { label: 'Завершить',       icon: <Check className="w-4 h-4" />,     variant: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
    noshow:   { label: 'Не явился',       icon: <UserCheck className="w-4 h-4" />, variant: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' },
    cancel:   { label: 'Отменить',        icon: <Ban className="w-4 h-4" />,       variant: 'bg-red-800 hover:bg-red-700 text-red-200' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md bg-onyx border border-border-luxury rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('px-5 py-4 border-b border-border-luxury flex items-start justify-between gap-3', cfg.bg)}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />
              <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
            </div>
            <h3 className="text-base font-serif font-medium text-text-primary truncate">{apt.clientName}</h3>
            <p className="text-sm text-text-secondary mt-0.5">{apt.services.join(', ')}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-text-secondary flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-2 text-sm border-b border-border-luxury">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Специалист</span>
            <span className="text-text-primary font-medium">{apt.specialistName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Время</span>
            <span className="text-text-primary font-mono">
              {formatLocalTime(apt.startAt)} – {formatLocalTime(apt.endAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Длительность</span>
            <span className="text-text-primary">{apt.duration} мин</span>
          </div>
          {apt.roomName && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Кабинет</span>
              <span className="text-text-primary">{apt.roomName}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Выручка</span>
            <span className="text-text-primary font-medium">{formatCurrency(apt.revenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Оплата</span>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium',
              apt.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
              apt.paymentStatus === 'DEPOSIT_PAID' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-zinc-700/50 text-zinc-400'
            )}>
              {apt.paymentStatus === 'PAID' ? 'Оплачено' :
               apt.paymentStatus === 'DEPOSIT_PAID' ? 'Депозит' :
               apt.paymentStatus === 'PARTIAL_PAID' ? 'Частично' :
               'Не оплачено'}
            </span>
          </div>
          {apt.waitMinutes !== null && apt.waitMinutes > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Ожидание</span>
              <span className="text-orange-300 font-medium">{apt.waitMinutes} мин</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Быстрые действия</p>
            <div className="grid grid-cols-2 gap-2">
              {actions.map(action => {
                const ui = ACTION_UI[action];
                return (
                  <button
                    key={action}
                    onClick={() => onAction(apt.id, action)}
                    disabled={actionLoading}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50',
                      ui.variant,
                    )}
                  >
                    {ui.icon}
                    {ui.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="px-5 pb-4 flex gap-2">
          <Link
            href={`/clients/${apt.clientId}`}
            className="flex-1 text-center text-xs py-2 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
            onClick={onClose}
          >
            Профиль клиента
          </Link>
          <Link
            href={`/bookings`}
            className="flex-1 text-center text-xs py-2 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
            onClick={onClose}
          >
            В список записей
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── BoardHeader ────────────────────────────────────────────────────────────────
interface BoardHeaderProps {
  data: TodayOperationsResponse | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
}

function BoardHeader({ data, isConnected, onRefresh, refreshing }: BoardHeaderProps) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const m   = data?.metrics;
  const revenue = data?.queue.reduce((s, a) => s + (a.operationalStatus !== 'CANCELLED' && a.operationalStatus !== 'NO_SHOW' ? a.revenue : 0), 0) ?? 0;
  const totalActive = (m?.pending ?? 0) + (m?.confirmed ?? 0) + (m?.arrived ?? 0) + (m?.waiting ?? 0) + (m?.inProgress ?? 0);
  const dateLabel = data?.date ? formatLocalDate(new Date(data.date + 'T12:00:00Z').toISOString()) : '';

  return (
    <div className="border-b border-border-luxury px-4 py-3 flex-shrink-0">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-medium text-text-primary capitalize truncate">{dateLabel}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-text-secondary text-xs font-mono">
                {now.toLocaleTimeString('ru-RU', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-text-tertiary text-xs">Екатеринбург</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* SSE status */}
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
            isConnected ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Записей сегодня',   value: m?.totalBookings ?? 0,             color: 'text-text-primary' },
          { label: 'Активных',          value: totalActive,                        color: 'text-yellow-300' },
          { label: 'В работе',          value: m?.inProgress ?? 0,                color: 'text-emerald-300' },
          { label: 'Завершено',         value: m?.completed ?? 0,                 color: 'text-zinc-300' },
          { label: 'Отмен',             value: (m?.cancelled ?? 0) + (m?.noShow ?? 0), color: 'text-red-400' },
          { label: 'Выручка (план)',    value: formatCurrency(revenue),            color: 'text-champagne' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-charcoal/60 border border-border-luxury rounded-xl px-3 py-2">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">{label}</p>
            <p className={cn('text-base font-medium font-mono', color)}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FilterBar ──────────────────────────────────────────────────────────────────
interface FilterBarProps {
  filters: BoardFilters;
  specialists: LiveSpecialist[];
  rooms: RoomStatus[];
  view: ViewMode;
  onFilters: (f: BoardFilters) => void;
  onView: (v: ViewMode) => void;
}

function FilterBar({ filters, specialists, rooms, view, onFilters, onView }: FilterBarProps) {
  const pill = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer';
  const active = 'bg-champagne text-obsidian';
  const inactive = 'bg-charcoal border border-border-luxury text-text-secondary hover:text-text-primary';

  const DEPT_FILTERS = [
    { value: '', label: 'Все' },
    { value: 'COSMETOLOGY', label: 'Косметология' },
    { value: 'MASSAGE', label: 'Массаж' },
    { value: 'RECEPTION', label: 'Ресепшн' },
  ];

  const STATUS_FILTERS = [
    { value: '', label: 'Все статусы' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'CONFIRMED', label: 'Подтверждён' },
    { value: 'PENDING', label: 'Ожидает' },
    { value: 'COMPLETED', label: 'Завершён' },
    { value: 'CANCELLED', label: 'Отменён' },
  ];

  const selectCls = 'bg-charcoal border border-border-luxury text-text-secondary text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-champagne/30 cursor-pointer';

  return (
    <div className="border-b border-border-luxury px-4 py-2 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 mr-2">
          {([
            { v: 'day' as ViewMode,     icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'По специалистам' },
            { v: 'room' as ViewMode,    icon: <Grid3X3 className="w-3.5 h-3.5" />,    label: 'По кабинетам' },
            { v: 'compact' as ViewMode, icon: <Rows className="w-3.5 h-3.5" />,       label: 'Компакт' },
          ] as const).map(({ v, icon, label }) => (
            <button key={v} onClick={() => onView(v)}
              className={cn(pill, 'flex items-center gap-1.5', view === v ? active : inactive)}
              title={label}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border-luxury mx-1 flex-shrink-0" />

        {/* Department filter */}
        <div className="flex items-center gap-1">
          {DEPT_FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => onFilters({ ...filters, department: value })}
              className={cn(pill, filters.department === value ? active : inactive)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border-luxury mx-1 flex-shrink-0" />

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={e => onFilters({ ...filters, status: e.target.value })}
          className={selectCls}
        >
          {STATUS_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Specialist filter */}
        <select
          value={filters.specialistId}
          onChange={e => onFilters({ ...filters, specialistId: e.target.value })}
          className={selectCls}
        >
          <option value="">Все специалисты</option>
          {specialists.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Room filter */}
        {view === 'day' && (
          <select
            value={filters.roomId}
            onChange={e => onFilters({ ...filters, roomId: e.target.value })}
            className={selectCls}
          >
            <option value="">Все кабинеты</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {(filters.department || filters.specialistId || filters.roomId || filters.status) && (
          <button
            onClick={() => onFilters({ department: '', specialistId: '', roomId: '', status: '' })}
            className={cn(pill, inactive, 'flex items-center gap-1')}
          >
            <X className="w-3 h-3" />
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}

// ── TimeColumn ─────────────────────────────────────────────────────────────────
function TimeColumn() {
  const slots: { label: string; top: number; major: boolean }[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      if (h === DAY_END_HOUR && m > 0) break;
      const isMajor = m === 0;
      const top = minutesToY(h * 60 + m);
      slots.push({
        label: isMajor ? `${String(h).padStart(2, '0')}:00` : '',
        top,
        major: isMajor,
      });
    }
  }

  return (
    <div
      className="flex-shrink-0 sticky left-0 z-20 bg-obsidian border-r border-border-luxury relative"
      style={{ width: TIME_COL_W, height: TOTAL_HEIGHT }}
    >
      {slots.map(({ label, top, major }) => (
        <div
          key={top}
          className="absolute left-0 right-0 flex items-center"
          style={{ top, height: SLOT_HEIGHT }}
        >
          {major && (
            <span className="pl-2 pr-1 text-[11px] font-mono text-text-tertiary leading-none select-none">
              {label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── GridLines ──────────────────────────────────────────────────────────────────
function GridLines() {
  const lines = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      if (h === DAY_END_HOUR && m > 0) break;
      const top = minutesToY(h * 60 + m);
      const isHour = m === 0;
      lines.push(
        <div
          key={`${h}-${m}`}
          className={cn('absolute left-0 right-0 border-t pointer-events-none',
            isHour ? 'border-border-luxury/50' : 'border-border-luxury/20'
          )}
          style={{ top }}
        />
      );
    }
  }
  return <>{lines}</>;
}

// ── CurrentTimeLine ─────────────────────────────────────────────────────────────
function CurrentTimeLine({ totalWidth }: { totalWidth: number }) {
  const [y, setY] = React.useState(currentTimeY);
  const isInRange = y >= 0 && y <= TOTAL_HEIGHT;

  React.useEffect(() => {
    const t = setInterval(() => setY(currentTimeY()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!isInRange) return null;

  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: y, width: totalWidth }}>
      <div className="relative flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-champagne flex-shrink-0 -ml-1 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
        <div className="flex-1 h-px bg-gradient-to-r from-champagne/90 to-champagne/20" />
      </div>
    </div>
  );
}

// ── SpecialistColumnHeader ─────────────────────────────────────────────────────
interface SpecHeaderProps {
  specialist: LiveSpecialist;
  aptCount: number;
  completedCount: number;
}

function SpecialistColumnHeader({ specialist, aptCount, completedCount }: SpecHeaderProps) {
  const occupancy = aptCount > 0 ? Math.round((completedCount / aptCount) * 100) : 0;
  const liveColor = specialist.liveStatus === 'BUSY' ? 'bg-emerald-400' :
                    specialist.liveStatus === 'OVERBOOKED' ? 'bg-red-400 animate-pulse' :
                    'bg-zinc-500';

  return (
    <div
      className="flex-shrink-0 border-r border-b border-border-luxury bg-onyx px-2 py-3 flex flex-col gap-1"
      style={{ width: SPEC_COL_W }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', liveColor)} />
        <span className="text-sm font-medium text-text-primary truncate leading-tight">{specialist.name}</span>
      </div>
      <span className={cn('text-[10px] font-medium', DEPT_COLOR[specialist.type] ?? 'text-text-tertiary')}>
        {DEPT_LABEL[specialist.type] ?? specialist.type}
      </span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-text-tertiary">{aptCount} записей</span>
        {aptCount > 0 && (
          <span className="text-[10px] text-zinc-500">{occupancy}% выпол.</span>
        )}
      </div>
    </div>
  );
}

// ── RoomColumnHeader ───────────────────────────────────────────────────────────
function RoomColumnHeader({ room }: { room: RoomStatus }) {
  const TYPE_LABEL: Record<string, string> = { MASSAGE: 'Массаж', COSMETOLOGY: 'Косметология', GENERAL: 'Общий' };
  const TYPE_COLOR: Record<string, string> = { MASSAGE: 'text-indigo-300', COSMETOLOGY: 'text-rose-300', GENERAL: 'text-sky-300' };

  return (
    <div
      className="flex-shrink-0 border-r border-b border-border-luxury bg-onyx px-2 py-3 flex flex-col gap-1"
      style={{ width: SPEC_COL_W }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', room.isOccupied ? 'bg-emerald-400' : 'bg-zinc-500')} />
        <span className="text-sm font-medium text-text-primary truncate">{room.name}</span>
      </div>
      <span className={cn('text-[10px] font-medium', TYPE_COLOR[room.type] ?? 'text-text-tertiary')}>
        {TYPE_LABEL[room.type] ?? room.type}
      </span>
      <span className="text-[10px] text-text-tertiary">{room.todayBookings} записей</span>
    </div>
  );
}

// ── CompactView ────────────────────────────────────────────────────────────────
function CompactView({ apts, onSelect }: { apts: OperationalAppointment[]; onSelect: (a: OperationalAppointment) => void }) {
  const sorted = [...apts].sort((a, b) => a.startAt.localeCompare(b.startAt));
  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary">
        <p className="text-sm">Нет записей по выбранным фильтрам</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="divide-y divide-border-luxury">
        {sorted.map(apt => {
          const cfg = STATUS_CFG[apt.operationalStatus] ?? STATUS_CFG.PENDING;
          return (
            <button
              key={apt.id}
              onClick={() => onSelect(apt)}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-charcoal/50 transition-colors flex items-center gap-4',
              )}
            >
              <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', cfg.dotColor)} />
              <div className="w-16 flex-shrink-0 font-mono text-sm text-text-secondary">
                {formatLocalTime(apt.startAt)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{apt.clientName}</p>
                <p className="text-xs text-text-secondary truncate">{apt.services[0]} · {apt.specialistName}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={cn('text-xs px-2 py-0.5 rounded-md border', cfg.bg, cfg.border, cfg.text)}>
                  {cfg.label}
                </span>
                {apt.roomName && (
                  <p className="text-[10px] text-text-tertiary mt-0.5">{apt.roomName}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right w-20">
                <p className="text-xs font-medium text-champagne">{formatCurrency(apt.revenue)}</p>
                <p className="text-[10px] text-text-tertiary">{apt.duration} мин</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main OpsBoard component ────────────────────────────────────────────────────
export function OpsBoard() {
  const [data, setData] = React.useState<TodayOperationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [filters, setFilters] = React.useState<BoardFilters>({ department: '', specialistId: '', roomId: '', status: '' });
  const [view, setView] = React.useState<ViewMode>('day');
  const [selectedApt, setSelectedApt] = React.useState<OperationalAppointment | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const gridBodyRef = React.useRef<HTMLDivElement>(null);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const fetchData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/operations/today', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setData(json.data as TodayOperationsResponse);
        setLastUpdated(new Date());
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // ── Polling backup ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    const t = setInterval(() => fetchData(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── SSE subscription ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource('/api/realtime/ops-stream');
      es.addEventListener('connected', () => setIsConnected(true));
      es.addEventListener('error', () => {
        setIsConnected(false);
        es?.close();
        retryTimeout = setTimeout(connect, 5000);
      });
      const refresh = () => fetchData(true);
      ['ops_refresh', 'booking_confirmed', 'booking_started', 'booking_completed', 'booking_cancelled', 'booking_no_show', 'client_arrived', 'room_assigned', 'specialist_reassigned'].forEach(evt => {
        es?.addEventListener(evt, refresh);
      });
    };

    connect();
    return () => {
      clearTimeout(retryTimeout);
      es?.close();
      setIsConnected(false);
    };
  }, [fetchData]);

  // ── Current time indicator: scroll to it on first load ──────────────────────
  React.useEffect(() => {
    if (!loading && gridBodyRef.current) {
      const y = currentTimeY();
      const offset = Math.max(0, y - 200);
      gridBodyRef.current.scrollTop = offset;
    }
  }, [loading]);

  // ── Quick action dispatch ────────────────────────────────────────────────────
  const handleAction = React.useCallback(async (id: string, action: TransitionAction) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/operations/appointments/${id}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setSelectedApt(null);
        await fetchData(true);
      }
    } catch {}
    finally { setActionLoading(false); }
  }, [fetchData]);

  // ── Apply filters ────────────────────────────────────────────────────────────
  const allApts = React.useMemo(() => data?.queue ?? [], [data]);
  const filteredApts = React.useMemo(() => {
    return allApts.filter(a => {
      if (filters.department && a.specialistType !== filters.department) return false;
      if (filters.specialistId && a.specialistId !== filters.specialistId) return false;
      if (filters.roomId && a.roomId !== filters.roomId) return false;
      if (filters.status && a.operationalStatus !== filters.status) return false;
      return true;
    });
  }, [allApts, filters]);

  const filteredSpecialists = React.useMemo(() => {
    let specs = data?.specialists ?? [];
    if (filters.department) specs = specs.filter(s => s.type === filters.department);
    if (filters.specialistId) specs = specs.filter(s => s.id === filters.specialistId);
    return specs;
  }, [data, filters]);

  const filteredRooms = React.useMemo(() => {
    let rooms = data?.rooms ?? [];
    if (filters.roomId) rooms = rooms.filter(r => r.id === filters.roomId);
    return rooms;
  }, [data, filters]);

  // ── Conflict detection ───────────────────────────────────────────────────────
  const conflictIds = React.useMemo(() => detectConflicts(filteredApts), [filteredApts]);

  // ── Column config (day view = specialists, room view = rooms) ─────────────────
  const columns: { id: string; label: string }[] = React.useMemo(() => {
    if (view === 'room') return filteredRooms.map(r => ({ id: r.id, label: r.name }));
    return filteredSpecialists.map(s => ({ id: s.id, label: s.name }));
  }, [view, filteredSpecialists, filteredRooms]);

  const totalGridWidth = TIME_COL_W + columns.length * SPEC_COL_W;

  // ── Appointments per column ───────────────────────────────────────────────────
  const aptsByColumn = React.useMemo(() => {
    const map = new Map<string, OperationalAppointment[]>();
    for (const col of columns) map.set(col.id, []);
    for (const apt of filteredApts) {
      const key = view === 'room' ? (apt.roomId ?? '') : apt.specialistId;
      const arr = map.get(key);
      if (arr) arr.push(apt);
      else if (view === 'room' && !apt.roomId) {
        // unassigned room — skip in room view
      }
    }
    return map;
  }, [filteredApts, columns, view]);

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Загрузка операционной панели...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-obsidian">
      {/* Metrics header */}
      <BoardHeader
        data={data}
        isConnected={isConnected}
        lastUpdated={lastUpdated}
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
      />

      {/* Filter + view toggle bar */}
      <FilterBar
        filters={filters}
        specialists={data?.specialists ?? []}
        rooms={data?.rooms ?? []}
        view={view}
        onFilters={setFilters}
        onView={setView}
      />

      {/* Compact view */}
      {view === 'compact' && (
        <CompactView apts={filteredApts} onSelect={setSelectedApt} />
      )}

      {/* Grid view (day + room) */}
      {view !== 'compact' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Sticky header row */}
          <div className="flex flex-shrink-0 border-b border-border-luxury overflow-hidden bg-onyx">
            {/* Corner */}
            <div
              className="flex-shrink-0 border-r border-border-luxury bg-obsidian flex items-center justify-center"
              style={{ width: TIME_COL_W }}
            >
              <Clock className="w-3.5 h-3.5 text-text-tertiary" />
            </div>
            {/* Specialist / room headers — horizontally scrollable to match body */}
            <div className="flex overflow-x-hidden" style={{ flex: '1 1 auto' }}>
              <div className="flex">
                {view === 'day' && filteredSpecialists.map(s => {
                  const colApts = aptsByColumn.get(s.id) ?? [];
                  const completed = colApts.filter(a => a.operationalStatus === 'COMPLETED').length;
                  return <SpecialistColumnHeader key={s.id} specialist={s} aptCount={colApts.length} completedCount={completed} />;
                })}
                {view === 'room' && filteredRooms.map(r => (
                  <RoomColumnHeader key={r.id} room={r} />
                ))}
                {columns.length === 0 && (
                  <div className="flex items-center px-6 py-3 text-sm text-text-tertiary">
                    Нет колонок по выбранным фильтрам
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div
            ref={gridBodyRef}
            className="flex-1 overflow-auto"
            onScroll={e => {
              // Sync horizontal scroll of sticky header
              const headerRow = e.currentTarget.previousElementSibling;
              const headerCols = headerRow?.querySelector('div > div') as HTMLElement | null;
              if (headerCols) headerCols.style.transform = `translateX(-${e.currentTarget.scrollLeft}px)`;
            }}
          >
            <div className="flex relative" style={{ minWidth: totalGridWidth, height: TOTAL_HEIGHT }}>
              {/* Time column (sticky left) */}
              <TimeColumn />

              {/* Columns + current time line */}
              <div className="flex relative" style={{ height: TOTAL_HEIGHT }}>
                {/* Current time line */}
                <CurrentTimeLine totalWidth={(columns.length) * SPEC_COL_W} />

                {columns.map(col => {
                  const colApts = aptsByColumn.get(col.id) ?? [];
                  return (
                    <div
                      key={col.id}
                      className="relative flex-shrink-0 border-r border-border-luxury/40"
                      style={{ width: SPEC_COL_W, height: TOTAL_HEIGHT }}
                    >
                      <GridLines />
                      {colApts.map(apt => (
                        <AppointmentBlock
                          key={apt.id}
                          apt={apt}
                          colWidth={SPEC_COL_W}
                          isConflict={conflictIds.has(apt.id)}
                          onClick={setSelectedApt}
                        />
                      ))}
                    </div>
                  );
                })}

                {columns.length === 0 && (
                  <div className="flex items-center justify-center px-8" style={{ height: TOTAL_HEIGHT, minWidth: 320 }}>
                    <p className="text-sm text-text-tertiary text-center">
                      Нет данных по выбранным фильтрам.<br />Попробуйте сбросить фильтры.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts bar */}
      {(data?.alerts.length ?? 0) > 0 && (
        <div className="flex-shrink-0 border-t border-border-luxury px-4 py-2 bg-charcoal/40">
          <div className="flex items-center gap-3 overflow-x-auto">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            {data!.alerts.slice(0, 5).map(alert => (
              <span
                key={alert.id}
                className={cn('text-xs flex-shrink-0 px-2 py-1 rounded-lg',
                  alert.severity === 'critical' ? 'bg-red-900/40 text-red-300 border border-red-700/40' :
                  alert.severity === 'warning'  ? 'bg-orange-900/40 text-orange-300 border border-orange-700/40' :
                  'bg-zinc-800 text-zinc-400 border border-zinc-700/40'
                )}
              >
                {alert.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick action modal */}
      {selectedApt && (
        <QuickActionModal
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
