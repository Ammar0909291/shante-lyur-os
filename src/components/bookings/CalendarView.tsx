'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentDetailDialog, type AppointmentLike } from '@/components/dialogs/appointment-detail-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarAppointment {
  id:               string;
  startAt:          string;
  endAt:            string;
  totalDuration:    number;
  status:           string;
  notes:            string | null;
  specialistId:     string;
  specialistName:   string;
  specialistAvatar: string | null;
  clientId:         string;
  clientName:       string;
  clientPhone:      string | null;
  services:         { serviceId: string; name: string; category: string; duration: number; price: number }[];
  totalPrice:       number;
}

export interface CalendarSpecialist {
  id:        string;
  userId:    string;
  name:      string;
  avatarUrl: string | null;
}

export interface CalendarData {
  date:         string;
  view:         'day' | 'week';
  from:         string;
  to:           string;
  specialists:  CalendarSpecialist[];
  appointments: CalendarAppointment[];
}

interface CalendarViewProps {
  onBookingCreated?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START    = 8;   // 08:00
const HOUR_END      = 22;  // 22:00
const TOTAL_HOURS   = HOUR_END - HOUR_START;         // 14
const TOTAL_MINUTES = TOTAL_HOURS * 60;              // 840
const PX_PER_HOUR   = 72;                            // pixels per hour
const PX_PER_MIN    = PX_PER_HOUR / 60;
const TOTAL_PX      = TOTAL_HOURS * PX_PER_HOUR;     // 1008px
const MIN_BLOCK_H   = 24;                             // minimum block height in px

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:     { bg: 'bg-amber-500/15',    border: 'border-amber-500/50',    text: 'text-amber-300' },
  CONFIRMED:   { bg: 'bg-champagne/12',    border: 'border-champagne/40',    text: 'text-champagne' },
  IN_PROGRESS: { bg: 'bg-blue-500/15',     border: 'border-blue-500/50',     text: 'text-blue-300' },
  COMPLETED:   { bg: 'bg-emerald-500/12',  border: 'border-emerald-500/40',  text: 'text-emerald-300' },
  NO_SHOW:     { bg: 'bg-red-500/10',      border: 'border-red-500/40',      text: 'text-red-300' },
  RESCHEDULED: { bg: 'bg-purple-500/12',   border: 'border-purple-500/40',   text: 'text-purple-300' },
};
const DEFAULT_COLOR = { bg: 'bg-charcoal', border: 'border-border-luxury', text: 'text-text-secondary' };

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function minutesFromMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function blockTop(startIso: string): number {
  const m = minutesFromMidnight(startIso);
  const offset = m - HOUR_START * 60;
  return Math.max(0, offset * PX_PER_MIN);
}

function blockHeight(duration: number): number {
  return Math.max(MIN_BLOCK_H, duration * PX_PER_MIN);
}

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function nowTopPx(): number | null {
  const now = new Date();
  const m   = now.getHours() * 60 + now.getMinutes();
  const off = m - HOUR_START * 60;
  if (off < 0 || off > TOTAL_MINUTES) return null;
  return off * PX_PER_MIN;
}

// ─── Appointment block ────────────────────────────────────────────────────────

function ApptBlock({
  appt,
  columnDate,
  onClick,
}: {
  appt:        CalendarAppointment;
  columnDate?: string; // for week view: only show if appt is on this day
  onClick:     (a: CalendarAppointment) => void;
}) {
  if (columnDate) {
    const apptDate = appt.startAt.slice(0, 10);
    if (apptDate !== columnDate) return null;
  }

  const top    = blockTop(appt.startAt);
  const height = blockHeight(appt.totalDuration);
  const colors = STATUS_COLORS[appt.status] ?? DEFAULT_COLOR;
  const compact = height < 48;
  const primaryService = appt.services[0]?.name ?? 'Услуга';

  return (
    <div
      className={cn(
        'absolute inset-x-0.5 rounded-lg border cursor-pointer select-none overflow-hidden',
        'transition-all hover:z-20 hover:shadow-lg hover:inset-x-0',
        colors.bg, colors.border,
      )}
      style={{ top, height, zIndex: 10 }}
      onClick={() => onClick(appt)}
    >
      <div className={cn('px-2 py-1 h-full flex flex-col justify-start', compact && 'py-0.5')}>
        <p className={cn('font-medium leading-tight truncate text-xs', colors.text)}>
          {appt.clientName}
        </p>
        {!compact && (
          <>
            <p className="text-[10px] text-text-muted leading-tight truncate mt-0.5">{primaryService}</p>
            <p className="text-[10px] text-text-muted leading-tight mt-auto">
              {formatHHMM(appt.startAt)}–{formatHHMM(appt.endAt)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Time gutter ──────────────────────────────────────────────────────────────

function TimeGutter() {
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);
  return (
    <div className="relative shrink-0 w-12 select-none" style={{ height: TOTAL_PX }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute right-2 text-[10px] text-text-muted leading-none"
          style={{ top: (h - HOUR_START) * PX_PER_HOUR - 6 }}
        >
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );
}

// ─── Grid lines ───────────────────────────────────────────────────────────────

function GridLines({ today }: { today: boolean }) {
  const lines = Array.from({ length: TOTAL_HOURS }, (_, i) => i);
  const halfLines = Array.from({ length: TOTAL_HOURS }, (_, i) => i);

  return (
    <div className={cn('absolute inset-0 pointer-events-none', today && 'bg-champagne/[0.015]')}>
      {lines.map((i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border-luxury/40"
          style={{ top: i * PX_PER_HOUR }}
        />
      ))}
      {halfLines.map((i) => (
        <div
          key={`h${i}`}
          className="absolute left-0 right-0 border-t border-border-luxury/20 border-dashed"
          style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
        />
      ))}
    </div>
  );
}

// ─── Now indicator ────────────────────────────────────────────────────────────

function NowLine() {
  const [top, setTop] = React.useState<number | null>(nowTopPx);
  React.useEffect(() => {
    const id = setInterval(() => setTop(nowTopPx()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (top === null) return null;
  return (
    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
      <div className="relative flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 shrink-0" />
        <div className="flex-1 h-px bg-red-400/70" />
      </div>
    </div>
  );
}

// ─── Day column ───────────────────────────────────────────────────────────────

function DayColumn({
  appointments,
  isToday,
  date,
  showNowLine,
  onApptClick,
}: {
  appointments: CalendarAppointment[];
  isToday:      boolean;
  date?:        string;
  showNowLine:  boolean;
  onApptClick:  (a: CalendarAppointment) => void;
}) {
  return (
    <div className="relative flex-1 min-w-0" style={{ height: TOTAL_PX }}>
      <GridLines today={isToday} />
      {showNowLine && isToday && <NowLine />}
      {appointments.map((a) => (
        <ApptBlock key={a.id} appt={a} columnDate={date} onClick={onApptClick} />
      ))}
    </div>
  );
}

// ─── Specialist avatar ────────────────────────────────────────────────────────

function SpecialistHeader({ specialist }: { specialist: CalendarSpecialist }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 min-w-0">
      <div className="w-8 h-8 rounded-full bg-champagne/20 flex items-center justify-center text-xs font-semibold text-champagne overflow-hidden shrink-0">
        {specialist.avatarUrl
          ? <img src={specialist.avatarUrl} alt={specialist.name} className="w-full h-full object-cover" />
          : initials(specialist.name)
        }
      </div>
      <p className="text-[11px] text-text-secondary font-medium text-center leading-tight truncate w-full px-1">
        {specialist.name.split(' ')[0]}
      </p>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView({ onBookingCreated }: CalendarViewProps) {
  const [calMode, setCalMode]     = React.useState<'day' | 'week'>('day');
  const [date, setDate]           = React.useState(toDateStr(new Date()));
  const [data, setData]           = React.useState<CalendarData | null>(null);
  const [loading, setLoading]     = React.useState(true);
  const [selected, setSelected]   = React.useState<AppointmentLike | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll to current hour on first load
  React.useEffect(() => {
    if (!loading && scrollRef.current) {
      const now = new Date();
      const offset = (now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) * PX_PER_MIN;
      scrollRef.current.scrollTop = Math.max(0, offset - 80);
    }
  }, [loading]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/calendar?date=${date}&view=${calMode}`);
      const json = await res.json();
      if (json.success) setData(json.data as CalendarData);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [date, calMode]);

  React.useEffect(() => { void fetchData(); }, [fetchData]);

  // Build week days array for week view
  const weekDays = React.useMemo((): string[] => {
    if (calMode !== 'week') return [];
    return Array.from({ length: 7 }, (_, i) => addDays(date, i));
  }, [calMode, date]);

  function navigate(delta: number) {
    setDate((d) => addDays(d, calMode === 'day' ? delta : delta * 7));
  }

  function goToday() { setDate(toDateStr(new Date())); }

  const todayStr = toDateStr(new Date());
  const isViewingToday = date === todayStr || (calMode === 'week' && weekDays.includes(todayStr));

  // Format header label
  const headerLabel = React.useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    if (calMode === 'day') {
      return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}, ${DAYS_RU[d.getDay()]}`;
    }
    const last = new Date(`${weekDays[6] ?? date}T12:00:00`);
    return `${d.getDate()}–${last.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
  }, [date, calMode, weekDays]);

  function toAppointmentLike(a: CalendarAppointment): AppointmentLike {
    return {
      id:         a.id,
      client:     a.clientName,
      service:    a.services.map((s) => s.name).join(', ') || 'Услуга',
      specialist: a.specialistName,
      time:       new Date(a.startAt),
      status:     a.status,
      amount:     a.totalPrice,
    };
  }

  const specialists = data?.specialists ?? [];
  const appointments = data?.appointments ?? [];

  return (
    <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden flex flex-col">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-luxury shrink-0">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-obsidian/60 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-obsidian/60 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-medium text-text-primary ml-1 min-w-[200px]">
            {headerLabel}
          </span>

          {!isViewingToday && (
            <button
              type="button"
              onClick={goToday}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-champagne bg-champagne/10 hover:bg-champagne/20 transition-colors ml-1"
            >
              <CalendarDays className="w-3 h-3" />
              Сегодня
            </button>
          )}
        </div>

        {/* Day / Week toggle */}
        <div className="flex gap-1 bg-obsidian/40 rounded-lg p-0.5">
          {(['day', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setCalMode(m)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                calMode === m
                  ? 'bg-charcoal text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {m === 'day' ? 'День' : 'Неделя'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column headers ────────────────────────────────────────────────── */}
      <div className="flex border-b border-border-luxury shrink-0 bg-obsidian/30">
        {/* Spacer for time gutter */}
        <div className="w-12 shrink-0" />

        {calMode === 'day' && specialists.map((s) => (
          <div key={s.id} className="flex-1 min-w-[100px] border-l border-border-luxury/50 first:border-l-0">
            <SpecialistHeader specialist={s} />
          </div>
        ))}

        {calMode === 'week' && weekDays.map((dayStr) => {
          const d      = new Date(`${dayStr}T12:00:00`);
          const isToday = dayStr === todayStr;
          return (
            <div
              key={dayStr}
              className={cn(
                'flex-1 min-w-[80px] border-l border-border-luxury/50 first:border-l-0 py-2 text-center',
                isToday && 'bg-champagne/5',
              )}
            >
              <p className={cn('text-[10px] font-medium uppercase tracking-wide', isToday ? 'text-champagne' : 'text-text-muted')}>
                {DAYS_RU[d.getDay()]}
              </p>
              <p className={cn('text-lg font-semibold leading-tight', isToday ? 'text-champagne' : 'text-text-secondary')}>
                {d.getDate()}
              </p>
            </div>
          );
        })}

        {!loading && specialists.length === 0 && calMode === 'day' && (
          <div className="flex-1 py-3 text-center text-xs text-text-muted">Нет специалистов</div>
        )}
      </div>

      {/* ── Scrollable grid ───────────────────────────────────────────────── */}
      <div ref={scrollRef} className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 400 }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-champagne/40 border-t-champagne rounded-full animate-spin" />
              <p className="text-xs text-text-muted">Загрузка расписания…</p>
            </div>
          </div>
        ) : (
          <div className="flex">
            {/* Time gutter */}
            <TimeGutter />

            {/* Columns */}
            {calMode === 'day' && (
              <>
                {specialists.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-64 text-sm text-text-muted">
                    Нет активных специалистов
                  </div>
                ) : (
                  specialists.map((s) => {
                    const colAppts = appointments.filter((a) => a.specialistId === s.id);
                    const isToday  = date === todayStr;
                    return (
                      <div
                        key={s.id}
                        className="flex-1 min-w-[100px] border-l border-border-luxury/30 first:border-l-0"
                      >
                        <DayColumn
                          appointments={colAppts}
                          isToday={isToday}
                          showNowLine={isToday}
                          onApptClick={(a) => setSelected(toAppointmentLike(a))}
                        />
                      </div>
                    );
                  })
                )}
              </>
            )}

            {calMode === 'week' && (
              <>
                {weekDays.map((dayStr) => {
                  const isToday  = dayStr === todayStr;
                  const dayAppts = appointments.filter((a) => a.startAt.slice(0, 10) === dayStr);
                  return (
                    <div
                      key={dayStr}
                      className={cn(
                        'flex-1 min-w-[80px] border-l border-border-luxury/30 first:border-l-0',
                        isToday && 'bg-champagne/[0.02]',
                      )}
                    >
                      <DayColumn
                        appointments={dayAppts}
                        isToday={isToday}
                        date={dayStr}
                        showNowLine={isToday}
                        onApptClick={(a) => setSelected(toAppointmentLike(a))}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Status legend ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-t border-border-luxury/40 bg-obsidian/20">
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('w-2.5 h-2.5 rounded-sm border', colors.bg, colors.border)} />
            <span className="text-[10px] text-text-muted capitalize">
              {{
                PENDING:     'Ожидает',
                CONFIRMED:   'Подтверждено',
                IN_PROGRESS: 'В процессе',
                COMPLETED:   'Завершено',
                NO_SHOW:     'Не пришёл',
                RESCHEDULED: 'Перенесено',
              }[status]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Appointment detail dialog ─────────────────────────────────────── */}
      <AppointmentDetailDialog
        appointment={selected}
        open={selected !== null}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        onChanged={() => { void fetchData(); onBookingCreated?.(); }}
      />
    </div>
  );
}
