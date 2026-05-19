'use client';

import * as React from 'react';
import { cn, formatCurrency } from '@/lib/utils';

// ── Layout constants ────────────────────────────────────────────────────────

const DAY_START  = 8 * 60;   // 08:00 in minutes
const DAY_END    = 21 * 60;  // 21:00 in minutes
const SLOT_H     = 20;       // px per 15-min slot
const TOTAL_H    = ((DAY_END - DAY_START) / 15) * SLOT_H; // 1040px
const COL_W      = 200;      // px per specialist column (min)
const LABEL_W    = 56;       // px for time label gutter

// ── Fallback colour palette for specialists without a set colour ────────────
const PALETTE = ['#c5a56e', '#7c9fb0', '#9b8db0', '#8fb06e', '#b08d7c', '#6e8fb0'];

// ── Types ───────────────────────────────────────────────────────────────────

export interface AppointmentItem {
  id: string;
  clientId: string;
  clientName: string;
  specialistId: string;
  specialistName: string;
  specialistColor: string | null;
  specialistSpecialization: string | null;
  locationId: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName: string;
  services: Array<{ serviceId: string; name: string; price: number; duration: number }>;
  totalPrice: number;
  totalDuration: number;
  notes: string | null;
}

export interface TimelineViewProps {
  appointments: AppointmentItem[];
  selectedDate: string; // YYYY-MM-DD
  onDrop: (aptId: string, newStartAtLocal: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (apt: AppointmentItem) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function minutesToPx(min: number): number {
  return ((min - DAY_START) / 15) * SLOT_H;
}

function pxToSnappedMinutes(px: number): number {
  const raw = DAY_START + Math.round(px / SLOT_H) * 15;
  return Math.max(DAY_START, Math.min(DAY_END - 15, raw));
}

function minutesToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// Using browser local time for display — operators are expected to be in salon timezone
function getLocalMin(isoStr: string): number {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

function isCancelled(status: string) {
  return status === 'CANCELLED' || status === 'NO_SHOW';
}

// ── Module-level drag state (one drag at a time) ─────────────────────────────
let _dragAptId: string | null = null;
let _dragYOffset = 0;

// ── Workload Panel ──────────────────────────────────────────────────────────

interface SpecialistWorkload {
  specialistId: string;
  specialistName: string;
  color: string;
  count: number;
  totalMin: number;
  workloadUnits: number;
  isMassage: boolean;
  idleGaps: Array<{ startMin: number; endMin: number; gapMin: number }>;
}

const MASSAGE_APPT_TARGET = 6;
const MASSAGE_DURATION_THRESHOLD = 75; // appointments >= this are "massage-type"
const IDLE_THRESHOLD = 30; // gaps >= this are reported as idle

function buildWorkloads(
  appointments: AppointmentItem[],
  specialistOrder: string[],
  colorMap: Map<string, string>,
): SpecialistWorkload[] {
  const active = appointments.filter(a => !isCancelled(a.status));

  const bySpec = new Map<string, AppointmentItem[]>();
  for (const apt of active) {
    if (!bySpec.has(apt.specialistId)) bySpec.set(apt.specialistId, []);
    bySpec.get(apt.specialistId)!.push(apt);
  }

  return specialistOrder.map(sid => {
    const apts = (bySpec.get(sid) ?? []).sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    const totalMin = apts.reduce((s, a) => s + a.totalDuration, 0);
    const workloadUnits = Math.round((totalMin / 60) * 10) / 10;

    const avgDuration = apts.length ? totalMin / apts.length : 0;
    const isMassage = avgDuration >= MASSAGE_DURATION_THRESHOLD ||
      (apts[0]?.specialistSpecialization ?? '').toLowerCase().includes('массаж');

    // Idle gaps
    const idleGaps: SpecialistWorkload['idleGaps'] = [];
    for (let i = 1; i < apts.length; i++) {
      const curStartMin = getLocalMin(apts[i].startAt);
      const prevEndMinCalc = getLocalMin(apts[i - 1].startAt) + apts[i - 1].totalDuration;
      const gap = curStartMin - prevEndMinCalc;
      if (gap >= IDLE_THRESHOLD) {
        idleGaps.push({
          startMin: prevEndMinCalc,
          endMin: curStartMin,
          gapMin: gap,
        });
      }
    }

    const specialist = apts[0];
    return {
      specialistId: sid,
      specialistName: specialist?.specialistName ?? 'Специалист',
      color: colorMap.get(sid) ?? PALETTE[0],
      count: apts.length,
      totalMin,
      workloadUnits,
      isMassage,
      idleGaps,
    };
  });
}

function WorkloadPanel({ workloads }: { workloads: SpecialistWorkload[] }) {
  if (workloads.every(w => w.count === 0)) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {workloads.map(w => {
        const massageProgress = Math.min(100, (w.count / MASSAGE_APPT_TARGET) * 100);
        const utilizationPct = Math.min(100, Math.round((w.totalMin / (DAY_END - DAY_START)) * 100));
        const totalH  = Math.floor(w.totalMin / 60);
        const totalM  = w.totalMin % 60;
        const isUnder = w.isMassage && w.count < MASSAGE_APPT_TARGET;
        const isOver  = w.isMassage && w.count > MASSAGE_APPT_TARGET + 2;

        return (
          <div
            key={w.specialistId}
            className="flex-1 min-w-[160px] max-w-[220px] rounded-xl bg-onyx border border-border-luxury p-3 space-y-2"
          >
            {/* Name + colour dot */}
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: w.color }}
              />
              <span className="text-xs font-medium text-text-primary truncate">{w.specialistName}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${w.isMassage ? massageProgress : utilizationPct}%`,
                  backgroundColor: w.color,
                }}
              />
            </div>

            {/* Stats */}
            <div className="space-y-0.5">
              <p className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">{w.count}</span> зап. ·{' '}
                {totalH > 0 && <span>{totalH}ч </span>}
                {totalM > 0 && <span>{totalM}мин</span>}
                {w.totalMin === 0 && <span className="text-text-tertiary">—</span>}
              </p>
              <p className="text-xs text-text-tertiary">
                {w.workloadUnits.toFixed(1)} ед. нагрузки
              </p>
            </div>

            {/* Massage target badge */}
            {w.isMassage && (
              <div className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md w-fit',
                isOver  ? 'bg-amber-500/15 text-amber-400' :
                isUnder ? 'bg-red-500/15 text-red-400' :
                          'bg-green-500/15 text-green-400'
              )}>
                {isOver  ? '⚠ Перегрузка' :
                 isUnder ? `${w.count}/${MASSAGE_APPT_TARGET} цель` :
                           `✓ ${w.count}/${MASSAGE_APPT_TARGET} цель`}
              </div>
            )}

            {/* Idle gaps */}
            {w.idleGaps.length > 0 && (
              <div className="text-[10px] text-amber-400/70">
                Простой: {w.idleGaps.map(g => `${minutesToHHMM(g.startMin)}–${minutesToHHMM(g.endMin)}`).join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Appointment card ────────────────────────────────────────────────────────

function AppointmentCard({
  apt,
  color,
  top,
  height,
  onStatusChange,
  onCancel,
  onReschedule,
}: {
  apt: AppointmentItem;
  color: string;
  top: number;
  height: number;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (apt: AppointmentItem) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cancelled = isCancelled(apt.status);
  const startTime = minutesToHHMM(getLocalMin(apt.startAt));
  const endTime   = minutesToHHMM(getLocalMin(apt.startAt) + apt.totalDuration);
  const tall = height >= 60;
  const narrow = height < 40;

  React.useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const canConfirm    = apt.status === 'PENDING' || apt.status === 'RESCHEDULED';
  const canStart      = apt.status === 'CONFIRMED';
  const canComplete   = apt.status === 'IN_PROGRESS';
  const canNoShow     = apt.status === 'IN_PROGRESS';
  const canReschedule = ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status);
  const canCancel     = ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status);
  const hasActions    = canConfirm || canStart || canComplete || canNoShow || canReschedule || canCancel;

  return (
    <div
      draggable={!cancelled}
      onDragStart={e => {
        if (cancelled) { e.preventDefault(); return; }
        _dragAptId = apt.id;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        _dragYOffset = e.clientY - rect.top;
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => { _dragAptId = null; _dragYOffset = 0; }}
      style={{
        position: 'absolute',
        top,
        height: Math.max(height, SLOT_H),
        left: 4,
        right: 4,
        backgroundColor: cancelled ? 'rgba(255,255,255,0.04)' : `${color}22`,
        borderLeft: `3px solid ${cancelled ? 'rgba(255,255,255,0.12)' : color}`,
      }}
      className={cn(
        'rounded-r-md overflow-hidden z-10 select-none',
        cancelled ? 'opacity-50 cursor-default' : 'cursor-grab active:cursor-grabbing',
        'transition-shadow hover:shadow-lg hover:z-20',
      )}
      title={`${apt.clientName} · ${apt.serviceName} · ${startTime}–${endTime}`}
    >
      <div className="h-full px-1.5 py-1 flex flex-col gap-0.5 relative">
        {/* Client name */}
        <p className="text-[11px] font-semibold text-text-primary leading-tight truncate">
          {apt.clientName}
        </p>

        {/* Service name — only if tall enough */}
        {!narrow && (
          <p className="text-[10px] text-text-secondary leading-tight truncate">
            {apt.serviceName}
          </p>
        )}

        {/* Time range — only if tall */}
        {tall && (
          <p className="text-[10px] text-text-tertiary leading-tight mt-auto">
            {startTime}–{endTime}
          </p>
        )}

        {/* Price — only if tall */}
        {tall && (
          <p className="text-[10px] font-medium tabular-nums" style={{ color }}>
            {formatCurrency(apt.totalPrice)}
          </p>
        )}

        {/* Context menu button */}
        {hasActions && (
          <div ref={menuRef} className="absolute top-0.5 right-0.5">
            <button
              onMouseDown={e => { e.stopPropagation(); }}
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="w-4 h-4 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Действия"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-5 z-30 w-44 rounded-xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden text-sm">
                {canConfirm  && <MenuItem label="Подтвердить"  onClick={() => { setMenuOpen(false); onStatusChange(apt.id, 'CONFIRMED'); }} />}
                {canStart    && <MenuItem label="Начать приём"  onClick={() => { setMenuOpen(false); onStatusChange(apt.id, 'IN_PROGRESS'); }} />}
                {canComplete && <MenuItem label="Завершить"     onClick={() => { setMenuOpen(false); onStatusChange(apt.id, 'COMPLETED'); }} />}
                {canNoShow   && <MenuItem label="Не явился"     onClick={() => { setMenuOpen(false); onStatusChange(apt.id, 'NO_SHOW'); }} />}
                {canReschedule && <MenuItem label="Перенести"   onClick={() => { setMenuOpen(false); onReschedule(apt); }} />}
                {canCancel   && (
                  <MenuItem
                    label="Отменить"
                    onClick={() => { setMenuOpen(false); onCancel(apt.id); }}
                    danger
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 text-xs transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-500/8 border-t border-border-luxury'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
      )}
    >
      {label}
    </button>
  );
}

// ── Specialist column ────────────────────────────────────────────────────────

function SpecialistColumn({
  specialistId: _specialistId,
  appointments,
  color,
  dateStr,
  onDrop,
  onStatusChange,
  onCancel,
  onReschedule,
}: {
  specialistId: string;
  appointments: AppointmentItem[];
  color: string;
  dateStr: string;
  onDrop: (aptId: string, newStartAtLocal: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (apt: AppointmentItem) => void;
}) {
  const [dropY, setDropY] = React.useState<number | null>(null);
  const colRef = React.useRef<HTMLDivElement>(null);

  function getRelY(e: React.DragEvent): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY - rect.top - _dragYOffset;
  }

  return (
    <div
      ref={colRef}
      className="relative border-l border-border-luxury/40 bg-transparent"
      style={{ minWidth: COL_W, height: TOTAL_H }}
      onDragOver={e => {
        if (!_dragAptId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = colRef.current!.getBoundingClientRect();
        setDropY(e.clientY - rect.top - _dragYOffset);
      }}
      onDragLeave={() => setDropY(null)}
      onDrop={e => {
        if (!_dragAptId) return;
        e.preventDefault();
        setDropY(null);
        const relY = getRelY(e);
        const snapped = pxToSnappedMinutes(relY);
        const time = minutesToHHMM(snapped);
        onDrop(_dragAptId, `${dateStr}T${time}:00`);
        _dragAptId = null;
      }}
    >
      {/* 15-min grid lines */}
      {Array.from({ length: (DAY_END - DAY_START) / 15 }).map((_, i) => {
        const min = DAY_START + i * 15;
        const isHour   = min % 60 === 0;
        const isHalfH  = min % 30 === 0;
        return (
          <div
            key={i}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: i * SLOT_H,
              height: 1,
              backgroundColor: isHour
                ? 'rgba(255,255,255,0.08)'
                : isHalfH
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.015)',
            }}
          />
        );
      })}

      {/* Drag preview line */}
      {dropY !== null && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-30"
          style={{
            top: Math.max(0, dropY),
            height: 2,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      )}

      {/* Appointment cards */}
      {appointments.map(apt => {
        const startMin = getLocalMin(apt.startAt);
        if (startMin < DAY_START || startMin >= DAY_END) return null;
        const top    = minutesToPx(startMin);
        const height = (apt.totalDuration / 15) * SLOT_H;
        return (
          <AppointmentCard
            key={apt.id}
            apt={apt}
            color={color}
            top={top}
            height={height}
            onStatusChange={onStatusChange}
            onCancel={onCancel}
            onReschedule={onReschedule}
          />
        );
      })}
    </div>
  );
}

// ── Time labels ──────────────────────────────────────────────────────────────

function TimeLabels() {
  const hours: number[] = [];
  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) hours.push(h);
  return (
    <div className="shrink-0 relative" style={{ width: LABEL_W, height: TOTAL_H }}>
      {hours.map(h => (
        <div
          key={h}
          className="absolute right-3 flex items-center"
          style={{
            top: minutesToPx(h * 60) - 7,
            height: 14,
          }}
        >
          <span className="text-[10px] text-text-tertiary tabular-nums select-none">
            {String(h).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Current time indicator ───────────────────────────────────────────────────

function CurrentTimeIndicator({ numCols: _numCols }: { numCols: number }) {
  const [nowMin, setNowMin] = React.useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  React.useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (nowMin < DAY_START || nowMin > DAY_END) return null;

  const top = minutesToPx(nowMin);
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        top,
        left: LABEL_W,
        right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent, #ef4444 8px)',
      }}
    >
      <div
        className="absolute -top-1.5 left-0 w-3 h-3 rounded-full bg-red-500"
        style={{ left: 4 }}
      />
    </div>
  );
}

// ── Main TimelineView ────────────────────────────────────────────────────────

export function TimelineView({
  appointments,
  selectedDate,
  onDrop,
  onStatusChange,
  onCancel,
  onReschedule,
}: TimelineViewProps) {
  // Deduplicate specialists in the order they first appear
  const specialists = React.useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string }>();
    for (const apt of appointments) {
      if (!seen.has(apt.specialistId)) {
        seen.set(apt.specialistId, {
          id: apt.specialistId,
          name: apt.specialistName,
          color: apt.specialistColor ?? '',
        });
      }
    }
    const list = [...seen.values()];
    // Assign fallback colours
    list.forEach((s, i) => {
      if (!s.color) s.color = PALETTE[i % PALETTE.length];
    });
    return list;
  }, [appointments]);

  const colorMap = React.useMemo(
    () => new Map(specialists.map(s => [s.id, s.color])),
    [specialists]
  );

  const bySpecialist = React.useMemo(() => {
    const m = new Map<string, AppointmentItem[]>();
    for (const apt of appointments) {
      if (!m.has(apt.specialistId)) m.set(apt.specialistId, []);
      m.get(apt.specialistId)!.push(apt);
    }
    return m;
  }, [appointments]);

  const workloads = React.useMemo(
    () => buildWorkloads(appointments, specialists.map(s => s.id), colorMap),
    [appointments, specialists, colorMap]
  );

  if (specialists.length === 0) {
    return (
      <div className="rounded-2xl bg-onyx border border-border-luxury flex items-center justify-center py-16 text-text-tertiary text-sm">
        Записей на выбранную дату нет
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workload panel */}
      <WorkloadPanel workloads={workloads} />

      {/* Timeline */}
      <div className="rounded-2xl bg-onyx border border-border-luxury overflow-hidden">
        {/* Specialist headers */}
        <div className="flex border-b border-border-luxury sticky top-0 z-10 bg-onyx">
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          {specialists.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-2 px-3 py-2.5 border-l border-border-luxury/40"
              style={{ minWidth: COL_W, flex: 1 }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs font-medium text-text-primary truncate">{s.name}</span>
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div className="overflow-x-auto">
          <div
            className="relative flex"
            style={{ minWidth: LABEL_W + specialists.length * COL_W }}
          >
            {/* Time labels */}
            <div className="sticky left-0 z-10 bg-onyx border-r border-border-luxury/40 shrink-0">
              <TimeLabels />
            </div>

            {/* Specialist columns + current time */}
            <div className="relative flex flex-1">
              {/* Current time indicator spans all columns */}
              <CurrentTimeIndicator numCols={specialists.length} />

              {specialists.map(s => (
                <div key={s.id} style={{ minWidth: COL_W, flex: 1 }}>
                  <SpecialistColumn
                    specialistId={s.id}
                    appointments={bySpecialist.get(s.id) ?? []}
                    color={s.color}
                    dateStr={selectedDate}
                    onDrop={onDrop}
                    onStatusChange={onStatusChange}
                    onCancel={onCancel}
                    onReschedule={onReschedule}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <p className="text-[10px] text-text-tertiary text-center">
        Перетащите карточку для переноса записи · ··· — меню действий
      </p>
    </div>
  );
}
