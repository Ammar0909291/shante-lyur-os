'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  Clock,
  User,
  Sparkles,
  CheckCircle2,
  XCircle,
  PlayCircle,
  UserCheck,
  Pause,
  TrendingUp,
  Loader2,
  Circle,
  Bed,
  DoorOpen,
  Coffee,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import type {
  TodayOperationsResponse,
  OperationalAppointment,
  LiveSpecialist,
  RoomStatus,
  OperationalAlert,
  OperationalStatus,
} from '@/types/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: 'Asia/Yekaterinburg',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    timeZone: 'Asia/Yekaterinburg',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

// Status labels resolved via t() inside each component — no module-level Russian strings

const STATUS_COLORS: Record<OperationalStatus, string> = {
  PENDING: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  CONFIRMED: 'bg-champagne/10 text-champagne border-champagne/30',
  ARRIVED: 'bg-teal-900/40 text-teal-300 border-teal-700/40',
  WAITING: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  IN_PROGRESS: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  COMPLETED: 'bg-green-900/40 text-green-300 border-green-700/40',
  CANCELLED: 'bg-charcoal text-text-tertiary border-border-luxury',
  NO_SHOW: 'bg-red-900/40 text-red-300 border-red-700/40',
  RESCHEDULED: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
};

// Alert labels resolved via t() inside AlertStrip — no module-level Russian strings

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-charcoal/60 animate-shimmer',
        className,
      )}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-28 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  className,
}: {
  status: OperationalStatus;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        STATUS_COLORS[status],
        className,
      )}
    >
      {t(`ops.status.${status.toLowerCase()}`)}
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: 'MASSAGE' | 'COSMETOLOGY' }) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
        type === 'MASSAGE'
          ? 'bg-amber-900/30 text-amber-300 border-amber-700/30'
          : 'bg-sage/10 text-sage border-sage/30',
      )}
    >
      {type === 'MASSAGE' ? <Bed className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
      {type === 'MASSAGE' ? t('ops.type.massage') : t('ops.type.cosmetology')}
    </span>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  transitioning,
  onTransition,
}: {
  appt: OperationalAppointment;
  transitioning: string | null;
  onTransition: (id: string, action: string) => void;
}) {
  const { t } = useLanguage();
  const isBusy = transitioning === appt.id;

  return (
    <div
      className={cn(
        'bg-onyx border border-border-luxury rounded-2xl p-4 transition-all duration-200 hover:border-border-light',
        appt.operationalStatus === 'IN_PROGRESS' &&
          'border-violet-700/40 shadow-[0_0_16px_rgba(139,92,246,0.06)]',
        appt.operationalStatus === 'WAITING' && 'border-amber-700/30',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Left: time + status */}
        <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
          <span className="text-base font-semibold text-text-primary font-mono tabular-nums">
            {fmtTime(appt.startAt)}
          </span>
          <StatusBadge status={appt.operationalStatus} />
        </div>

        {/* Center: details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-text-primary text-sm truncate">
              {appt.clientName}
            </span>
            {appt.delayMinutes > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-900/30 border border-red-700/30 text-red-300 text-xs">
                <Clock className="w-3 h-3" />+{appt.delayMinutes}{t('common.min')} {t('ops.late')}
              </span>
            )}
            {appt.waitMinutes !== null && appt.waitMinutes > 15 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-900/30 border border-amber-700/30 text-amber-300 text-xs">
                <Pause className="w-3 h-3" />{t('ops.waiting')} {appt.waitMinutes}{t('common.min')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-1.5 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {appt.specialistName}
            </span>
            <TypeBadge type={appt.specialistType} />
            {appt.roomName && (
              <span className="flex items-center gap-1">
                <Bed className="w-3 h-3" />
                {appt.roomName}
              </span>
            )}
          </div>

          <p className="text-xs text-text-tertiary mb-2 line-clamp-1">
            {appt.services.join(', ')}
          </p>

          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {appt.duration}{t('common.min')}
            </span>
            <span className="text-champagne font-medium">
              {formatCurrency(appt.revenue)}
            </span>
            <span className="text-text-tertiary">
              {fmtTime(appt.startAt)} – {fmtTime(appt.endAt)}
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {appt.operationalStatus === 'PENDING' && (
            <>
              <ActionBtn
                label={t('ops.action.confirm')}
                icon={<CheckCircle2 className="w-3 h-3" />}
                color="champagne"
                loading={isBusy}
                onClick={() => onTransition(appt.id, 'confirm')}
              />
              <ActionBtn
                label={t('ops.action.checkin')}
                icon={<UserCheck className="w-3 h-3" />}
                color="teal"
                loading={isBusy}
                onClick={() => onTransition(appt.id, 'checkin')}
              />
              <ActionBtn
                label={t('ops.action.noshow')}
                icon={<XCircle className="w-3 h-3" />}
                color="red"
                loading={isBusy}
                onClick={() => onTransition(appt.id, 'noshow')}
              />
              <ActionBtn
                label={t('ops.action.cancel')}
                icon={<XCircle className="w-3 h-3" />}
                color="gray"
                loading={isBusy}
                onClick={() => onTransition(appt.id, 'cancel')}
              />
            </>
          )}
          {(appt.operationalStatus === 'CONFIRMED' ||
            appt.operationalStatus === 'ARRIVED' ||
            appt.operationalStatus === 'WAITING') && (
            <>
              <ActionBtn
                label={t('ops.action.start')}
                icon={<PlayCircle className="w-3 h-3" />}
                color="violet"
                loading={isBusy}
                onClick={() => onTransition(appt.id, 'start')}
              />
              <ActionBtn
                label={t('ops.action.cancel')}
                icon={<XCircle className="w-3 h-3" />}
                color="gray"
                loading={isBusy}
                onClick={() => onTransition(appt.id, 'cancel')}
              />
            </>
          )}
          {appt.operationalStatus === 'IN_PROGRESS' && (
            <ActionBtn
              label={t('ops.action.complete')}
              icon={<CheckCircle2 className="w-3 h-3" />}
              color="green"
              loading={isBusy}
              onClick={() => onTransition(appt.id, 'complete')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────

type ActionColor = 'champagne' | 'teal' | 'red' | 'gray' | 'violet' | 'green';

const ACTION_COLOR_CLASSES: Record<ActionColor, string> = {
  champagne:
    'bg-champagne/10 border-champagne/30 text-champagne hover:bg-champagne/20',
  teal: 'bg-teal-900/30 border-teal-700/30 text-teal-300 hover:bg-teal-900/50',
  red: 'bg-red-900/30 border-red-700/30 text-red-300 hover:bg-red-900/50',
  gray: 'bg-charcoal border-border-luxury text-text-tertiary hover:text-text-secondary hover:bg-charcoal/80',
  violet:
    'bg-violet-900/30 border-violet-700/30 text-violet-300 hover:bg-violet-900/50',
  green:
    'bg-green-900/30 border-green-700/30 text-green-300 hover:bg-green-900/50',
};

function ActionBtn({
  label,
  icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  color: ActionColor;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50',
        ACTION_COLOR_CLASSES[color],
      )}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─── Alert Strip ─────────────────────────────────────────────────────────────

function AlertStrip({ alerts }: { alerts: OperationalAlert[] }) {
  const { t } = useLanguage();
  const criticals = alerts.filter((a) => a.severity === 'critical');
  if (criticals.length === 0) return null;
  return (
    <div className="mb-4 bg-red-950/40 border border-red-700/40 rounded-xl p-3 flex flex-col gap-1.5 animate-fade-in">
      <div className="flex items-center gap-2 text-red-300 text-sm font-semibold mb-1">
        <AlertTriangle className="w-4 h-4" />
        {t('ops.alert.critical')} ({criticals.length})
      </div>
      {criticals.map((alert) => (
        <div key={alert.id} className="flex items-start gap-2 text-xs text-red-200">
          <Circle className="w-2 h-2 mt-0.5 shrink-0 fill-red-400 text-red-400" />
          <span>
            <span className="font-medium">{t(`ops.alert.${alert.type.toLowerCase()}`) || alert.type}:</span>{' '}
            {alert.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Queue Tab ────────────────────────────────────────────────────────────────

function QueueTab({
  queue,
  alerts,
  filter,
  onFilterChange,
  transitioning,
  onTransition,
}: {
  queue: OperationalAppointment[];
  alerts: OperationalAlert[];
  filter: OperationalStatus | 'ALL';
  onFilterChange: (f: OperationalStatus | 'ALL') => void;
  transitioning: string | null;
  onTransition: (id: string, action: string) => void;
}) {
  const { t } = useLanguage();
  const QUEUE_FILTERS: { value: OperationalStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: t('ops.filter.all') },
    { value: 'PENDING', label: t('ops.status.pending') },
    { value: 'CONFIRMED', label: t('ops.status.confirmed') },
    { value: 'ARRIVED', label: t('ops.status.arrived') },
    { value: 'WAITING', label: t('ops.status.waiting') },
    { value: 'IN_PROGRESS', label: t('ops.status.in_progress') },
    { value: 'COMPLETED', label: t('ops.status.completed') },
  ];
  const filtered =
    filter === 'ALL'
      ? queue
      : queue.filter((a) => a.operationalStatus === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div>
      <AlertStrip alerts={alerts} />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {QUEUE_FILTERS.map((f) => {
          const count =
            f.value === 'ALL'
              ? queue.length
              : queue.filter((a) => a.operationalStatus === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-champagne/10 border-champagne/40 text-champagne'
                  : 'bg-onyx border-border-luxury text-text-tertiary hover:text-text-secondary hover:bg-charcoal',
              )}
            >
              {f.label}
              {count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
                    filter === f.value
                      ? 'bg-champagne/20 text-champagne'
                      : 'bg-charcoal text-text-tertiary',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {sorted.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <Activity className="w-10 h-10 text-text-tertiary" />
          <p className="text-text-secondary text-sm">{t('ops.queue.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              transitioning={transitioning}
              onTransition={onTransition}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Specialist Card ──────────────────────────────────────────────────────────

const LIVE_STATUS_COLORS: Record<string, string> = {
  FREE: 'bg-green-900/30 text-green-300 border-green-700/30',
  BUSY: 'bg-red-900/30 text-red-300 border-red-700/30',
  OVERBOOKED: 'bg-red-900/50 text-red-200 border-red-600/50',
  OFFLINE: 'bg-charcoal text-text-tertiary border-border-luxury',
};

function SpecialistCard({ specialist }: { specialist: LiveSpecialist }) {
  const { t } = useLanguage();
  const progressPct =
    specialist.todayScheduled > 0
      ? Math.round((specialist.todayCompleted / specialist.todayScheduled) * 100)
      : 0;

  const weightPct =
    specialist.massageWeight !== null && specialist.massageWeightTarget
      ? Math.min(
          100,
          Math.round((specialist.massageWeight / specialist.massageWeightTarget) * 100),
        )
      : null;

  return (
    <div
      className={cn(
        'bg-onyx border border-border-luxury rounded-2xl p-4 transition-all duration-200 hover:border-border-light',
        specialist.liveStatus === 'OVERBOOKED' &&
          'border-red-600/40 shadow-[0_0_12px_rgba(239,68,68,0.06)] animate-shimmer',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-text-primary text-sm">{specialist.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={specialist.type} />
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
            LIVE_STATUS_COLORS[specialist.liveStatus],
            specialist.liveStatus === 'OVERBOOKED' && 'animate-pulse',
          )}
        >
          {t(`ops.live.${specialist.liveStatus.toLowerCase()}`)}
        </span>
      </div>

      {/* Current procedure */}
      {specialist.currentAppointment && (
        <div className="mb-3 p-2.5 rounded-xl bg-charcoal border border-border-luxury text-xs">
          <p className="text-text-tertiary mb-0.5">{t('ops.specialist.now')}</p>
          <p className="text-text-primary font-medium line-clamp-1">
            {specialist.currentAppointment.services[0] ?? '—'}
          </p>
          <p className="text-text-secondary mt-0.5">
            {fmtTime(specialist.currentAppointment.endAt)}
          </p>
        </div>
      )}

      {/* Next appointment */}
      {specialist.nextAppointment && (
        <div className="mb-3 text-xs text-text-tertiary flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{t('ops.specialist.next')} </span>
          <span className="text-text-secondary">
            {fmtTime(specialist.nextAppointment.startAt)} —{' '}
            {specialist.nextAppointment.clientName}
          </span>
        </div>
      )}

      {/* Today's progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-tertiary flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t('ops.specialist.today')}
          </span>
          <span className="text-text-secondary">
            {specialist.todayCompleted}/{specialist.todayScheduled} {t('ops.specialist.sessions')}
          </span>
        </div>
        <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
          <div
            className="h-full bg-champagne rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Massage weight */}
      {specialist.type === 'MASSAGE' &&
        specialist.massageWeight !== null &&
        specialist.massageWeightTarget && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-tertiary">{t('ops.specialist.load')}</span>
              <span
                className={cn(
                  'font-mono',
                  (weightPct ?? 0) >= 100 ? 'text-red-300' : 'text-text-secondary',
                )}
              >
                {specialist.massageWeight.toFixed(1)}/{specialist.massageWeightTarget.toFixed(1)} {t('ops.specialist.units')}
              </span>
            </div>
            <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  (weightPct ?? 0) >= 100 ? 'bg-red-500' : 'bg-amber-400',
                )}
                style={{ width: `${weightPct ?? 0}%` }}
              />
            </div>
          </div>
        )}
    </div>
  );
}

// ─── Specialists Tab ──────────────────────────────────────────────────────────

function SpecialistsTab({ specialists }: { specialists: LiveSpecialist[] }) {
  const { t } = useLanguage();
  if (specialists.length === 0) {
    return (
      <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
        <User className="w-10 h-10 text-text-tertiary" />
        <p className="text-text-secondary text-sm">{t('ops.specialist.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {specialists.map((s) => (
        <SpecialistCard key={s.id} specialist={s} />
      ))}
    </div>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: RoomStatus }) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        'bg-onyx border border-border-luxury rounded-2xl p-4 transition-all duration-200 hover:border-border-light',
        room.isOccupied && 'border-red-700/30',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-text-primary text-sm">{room.name}</p>
          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md border text-xs bg-charcoal border-border-luxury text-text-tertiary">
            {t(`ops.room.type.${room.type.toLowerCase()}`) || room.type}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium',
            room.isOccupied
              ? 'bg-red-900/30 text-red-300 border-red-700/30'
              : 'bg-green-900/30 text-green-300 border-green-700/30',
          )}
        >
          <Circle
            className={cn(
              'w-2 h-2 fill-current',
              room.isOccupied ? 'text-red-400' : 'text-green-400',
            )}
          />
          {room.isOccupied ? t('ops.room.occupied') : t('ops.room.free')}
        </span>
      </div>

      {room.isOccupied && room.currentAppointment && (
        <div className="mb-3 p-2.5 rounded-xl bg-charcoal border border-border-luxury text-xs space-y-1">
          <p className="text-text-primary font-medium">{room.currentAppointment.clientName}</p>
          <p className="text-text-secondary">{room.currentAppointment.specialistName}</p>
          <p className="text-text-tertiary">
            {fmtTime(room.currentAppointment.endAt)}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-tertiary">
        {room.nextAvailableAt ? (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t('ops.room.availableFrom')} {fmtTime(room.nextAvailableAt)}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            {t('ops.room.availableNow')}
          </span>
        )}
        <span>{room.todayBookings} {t('ops.room.bookingsToday')}</span>
      </div>
    </div>
  );
}

// ─── Rooms Tab ────────────────────────────────────────────────────────────────

function RoomsTab({ rooms }: { rooms: RoomStatus[] }) {
  const { t } = useLanguage();
  if (rooms.length === 0) {
    return (
      <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
        <Bed className="w-10 h-10 text-text-tertiary" />
        <p className="text-text-secondary text-sm font-medium">{t('ops.room.empty')}</p>
        <p className="text-text-tertiary text-xs">
          {t('ops.room.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 22;
const TIMELINE_TOTAL_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;

function timeToPercent(iso: string): number {
  const d = new Date(iso);
  const msk = new Date(
    d.toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
  );
  const minutesFromStart =
    msk.getHours() * 60 +
    msk.getMinutes() -
    TIMELINE_START_HOUR * 60;
  return Math.max(0, Math.min(100, (minutesFromStart / TIMELINE_TOTAL_MINUTES) * 100));
}

function durationToPercent(durationMinutes: number): number {
  return Math.max(0.5, (durationMinutes / TIMELINE_TOTAL_MINUTES) * 100);
}

const BLOCK_COLORS: Record<OperationalStatus, string> = {
  PENDING: 'bg-blue-800/60 border-blue-600/40 text-blue-200',
  CONFIRMED: 'bg-champagne/20 border-champagne/40 text-champagne',
  ARRIVED: 'bg-teal-800/60 border-teal-600/40 text-teal-200',
  WAITING: 'bg-amber-800/60 border-amber-600/40 text-amber-200',
  IN_PROGRESS: 'bg-violet-800/70 border-violet-600/50 text-violet-100',
  COMPLETED: 'bg-green-900/50 border-green-700/40 text-green-300',
  CANCELLED: 'bg-charcoal border-border-luxury text-text-tertiary',
  NO_SHOW: 'bg-red-900/40 border-red-700/30 text-red-300',
  RESCHEDULED: 'bg-indigo-900/40 border-indigo-700/30 text-indigo-300',
};

interface TooltipState {
  appointmentId: string;
  x: number;
  y: number;
}

function TimelineTab({
  specialists,
  queue,
}: {
  specialists: LiveSpecialist[];
  queue: OperationalAppointment[];
}) {
  const { t } = useLanguage();
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);

  const tooltipAppt = tooltip
    ? queue.find((a) => a.id === tooltip.appointmentId) ?? null
    : null;

  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
    (_, i) => TIMELINE_START_HOUR + i,
  );

  if (specialists.length === 0) {
    return (
      <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
        <Activity className="w-10 h-10 text-text-tertiary" />
        <p className="text-text-secondary text-sm">{t('ops.timeline.empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      {/* Hour header */}
      <div className="flex border-b border-border-luxury">
        <div className="w-36 shrink-0 px-3 py-2 text-xs text-text-tertiary border-r border-border-luxury">
          {t('ops.timeline.specialist')}
        </div>
        <div className="flex-1 relative h-8">
          {hours.map((h) => {
            const pct = ((h - TIMELINE_START_HOUR) / (TIMELINE_END_HOUR - TIMELINE_START_HOUR)) * 100;
            return (
              <span
                key={h}
                className="absolute top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary"
                style={{ left: `${pct}%` }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-luxury">
        {specialists.map((spec) => {
          const specAppts = queue.filter(
            (a) => a.specialistId === spec.id,
          );
          return (
            <div key={spec.id} className="flex min-h-[48px]">
              {/* Specialist name */}
              <div className="w-36 shrink-0 px-3 py-2 flex flex-col justify-center border-r border-border-luxury">
                <p className="text-xs font-medium text-text-primary truncate">
                  {spec.name}
                </p>
                <span
                  className={cn(
                    'text-[10px]',
                    spec.type === 'MASSAGE' ? 'text-amber-400' : 'text-sage',
                  )}
                >
                  {spec.type === 'MASSAGE' ? t('ops.type.massage') : t('ops.type.cosmetology')}
                </span>
              </div>

              {/* Timeline track */}
              <div className="flex-1 relative py-2">
                {/* Grid lines */}
                {hours.map((h) => {
                  const pct = ((h - TIMELINE_START_HOUR) / (TIMELINE_END_HOUR - TIMELINE_START_HOUR)) * 100;
                  return (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-border-luxury/50"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}

                {/* Appointment blocks */}
                {specAppts.map((appt) => {
                  const left = timeToPercent(appt.startAt);
                  const width = durationToPercent(appt.duration);
                  return (
                    <button
                      key={appt.id}
                      className={cn(
                        'absolute top-1 bottom-1 rounded border text-[10px] font-medium overflow-hidden truncate px-1 cursor-pointer transition-opacity hover:opacity-90',
                        BLOCK_COLORS[appt.operationalStatus],
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onClick={(e) =>
                        setTooltip(
                          tooltip?.appointmentId === appt.id
                            ? null
                            : {
                                appointmentId: appt.id,
                                x: e.clientX,
                                y: e.clientY,
                              },
                        )
                      }
                    >
                      {appt.clientName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && tooltipAppt && (
        <div
          className="fixed z-50 w-64 bg-onyx border border-border-light rounded-xl shadow-luxury-lg p-3 text-xs pointer-events-none"
          style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
        >
          <p className="font-semibold text-text-primary mb-1">
            {tooltipAppt.clientName}
          </p>
          <p className="text-text-secondary mb-1">
            {tooltipAppt.specialistName}
          </p>
          <p className="text-text-tertiary mb-1">
            {fmtTime(tooltipAppt.startAt)} – {fmtTime(tooltipAppt.endAt)} ({tooltipAppt.duration}{t('common.min')})
          </p>
          <p className="text-text-tertiary line-clamp-2 mb-1">
            {tooltipAppt.services.join(', ')}
          </p>
          <div className="flex items-center justify-between mt-2">
            <StatusBadge status={tooltipAppt.operationalStatus} />
            <span className="text-champagne font-medium">
              {formatCurrency(tooltipAppt.revenue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metrics Bar ─────────────────────────────────────────────────────────────

function MetricsBar({
  metrics,
  alertCount,
}: {
  metrics: OperationalMetrics | undefined;
  alertCount: number;
}) {
  const { t } = useLanguage();
  if (!metrics) return null;

  const chips: { label: string; value: number | string; color: string; icon: React.ReactNode }[] = [
    {
      label: t('ops.metrics.total'),
      value: metrics.totalBookings,
      color: 'border-border-luxury text-text-secondary',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      label: t('ops.metrics.inProgress'),
      value: metrics.inProgress,
      color: 'border-violet-700/30 text-violet-300 bg-violet-900/20',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
    {
      label: t('ops.metrics.waiting'),
      value: metrics.waiting,
      color: 'border-amber-700/30 text-amber-300 bg-amber-900/20',
      icon: <Pause className="w-3.5 h-3.5" />,
    },
    {
      label: t('ops.metrics.completed'),
      value: metrics.completed,
      color: 'border-green-700/30 text-green-300 bg-green-900/20',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    {
      label: t('ops.metrics.noShow'),
      value: metrics.noShow,
      color:
        metrics.noShow > 0
          ? 'border-red-700/30 text-red-300 bg-red-900/20'
          : 'border-border-luxury text-text-tertiary',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    {
      label: t('ops.metrics.alerts'),
      value: alertCount,
      color:
        alertCount > 0
          ? 'border-red-700/40 text-red-300 bg-red-900/30 animate-pulse'
          : 'border-border-luxury text-text-tertiary',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium',
            chip.color,
          )}
        >
          {chip.icon}
          <span className="text-current opacity-70">{chip.label}</span>
          <span className="font-bold text-sm">{chip.value}</span>
        </div>
      ))}

      {metrics.avgWaitMinutes > 0 && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border-luxury text-xs text-text-tertiary">
          <Clock className="w-3.5 h-3.5" />
          <span>{t('ops.metrics.avgWait')}</span>
          <span className="font-bold text-text-secondary">
            {Math.round(metrics.avgWaitMinutes)}{t('common.min')}
          </span>
        </div>
      )}
    </div>
  );
}

// Declare type for import
import type { OperationalMetrics } from '@/types/operations';

// ─── Workload Summary Bar ─────────────────────────────────────────────────────

function WorkloadSummaryBar({
  specialists,
  rooms,
}: {
  specialists: LiveSpecialist[];
  rooms: RoomStatus[];
}) {
  const { t } = useLanguage();

  const overloaded = specialists.filter((s) => s.liveStatus === 'OVERBOOKED');
  const idle = specialists.filter(
    (s) => s.liveStatus === 'FREE' && s.todayScheduled === 0,
  );
  const freeRooms = rooms.filter((r) => !r.isOccupied);

  if (overloaded.length === 0 && idle.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-2 animate-fade-in">
      {overloaded.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-950/40 border border-red-700/40 text-red-300 text-xs font-medium animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{t('rec.workload.overloaded')}:</span>
          <span className="font-bold text-sm">{overloaded.length}</span>
          <span className="text-red-400/70 hidden sm:inline">
            {overloaded.map((s) => s.name).join(', ')}
          </span>
        </div>
      )}
      {idle.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-700/30 text-amber-300 text-xs font-medium">
          <Coffee className="w-3.5 h-3.5 shrink-0" />
          <span>{t('rec.workload.idle')}:</span>
          <span className="font-bold text-sm">{idle.length}</span>
          <span className="text-amber-400/70 hidden sm:inline">
            {idle.map((s) => s.name).join(', ')}
          </span>
        </div>
      )}
      {freeRooms.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-950/30 border border-green-700/30 text-green-300 text-xs font-medium">
          <DoorOpen className="w-3.5 h-3.5 shrink-0" />
          <span>{t('rec.workload.freeRooms')}:</span>
          <span className="font-bold text-sm">{freeRooms.length}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { t } = useLanguage();
  const [data, setData] = React.useState<TodayOperationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    'queue' | 'specialists' | 'rooms' | 'timeline'
  >('queue');
  const [queueFilter, setQueueFilter] = React.useState<OperationalStatus | 'ALL'>('ALL');
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [transitioning, setTransitioning] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState(30);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/operations/today', { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } | string };
        const errMsg = typeof body.error === 'string' ? body.error : (body.error?.message ?? `HTTP ${res.status}`);
        throw new Error(errMsg);
      }
      const json = (await res.json()) as { success: boolean; data: TodayOperationsResponse };
      if (json.success && json.data) {
        setData(json.data);
        setLastUpdated(new Date());
        setCountdown(30);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + polling
  React.useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Countdown timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  async function transition(appointmentId: string, action: string) {
    setTransitioning(appointmentId);
    try {
      const res = await fetch(
        `/api/operations/appointments/${appointmentId}/transition`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      if (res.ok) await load(true);
    } finally {
      setTransitioning(null);
    }
  }

  const criticalAlertCount =
    data?.alerts.filter((a) => a.severity === 'critical').length ?? 0;

  const TABS: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'queue', label: t('ops.tab.queue'), icon: <Activity className="w-4 h-4" /> },
    { id: 'specialists', label: t('ops.tab.specialists'), icon: <User className="w-4 h-4" /> },
    { id: 'rooms', label: t('ops.tab.rooms'), icon: <Bed className="w-4 h-4" /> },
    { id: 'timeline', label: t('ops.tab.timeline'), icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-obsidian px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-text-tertiary mb-4">
          <Link
            href="/dashboard"
            className="hover:text-champagne transition-colors"
          >
            {t('common.dashboard')}
          </Link>
          <span>/</span>
          <span className="text-text-secondary">{t('ops.breadcrumb')}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-text-primary flex items-center gap-2">
              <Activity className="w-6 h-6 text-champagne" />
              {t('ops.title')}
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {t('ops.subtitle')}
            </p>
            {data?.date && (
              <p className="text-text-tertiary text-xs mt-1 capitalize">
                {fmtDate(data.date)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {lastUpdated && (
              <div className="text-right">
                <p className="text-xs text-text-tertiary">
                  {t('ops.lastUpdated')}:{' '}
                  <span className="text-text-secondary font-mono">
                    {lastUpdated.toLocaleTimeString('ru-RU', {
                      timeZone: 'Asia/Yekaterinburg',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
                <p className="text-[10px] text-text-tertiary">
                  {t('ops.refreshIn').replace('{n}', String(countdown))}
                </p>
              </div>
            )}
            <button
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t('ops.refresh')}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-700/40 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => void load()}
              className="ml-auto text-xs underline hover:no-underline"
            >
              {t('ops.retry')}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !data ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Metrics Bar */}
            <MetricsBar
              metrics={data?.metrics}
              alertCount={criticalAlertCount}
            />

            {/* Workload summary — only when there's something to flag */}
            <WorkloadSummaryBar
              specialists={data?.specialists ?? []}
              rooms={data?.rooms ?? []}
            />

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-onyx border border-border-luxury rounded-xl p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-charcoal text-champagne shadow-inner-luxury'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-charcoal/50',
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'queue' && criticalAlertCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {criticalAlertCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
              {activeTab === 'queue' && (
                <QueueTab
                  queue={data?.queue ?? []}
                  alerts={data?.alerts ?? []}
                  filter={queueFilter}
                  onFilterChange={setQueueFilter}
                  transitioning={transitioning}
                  onTransition={transition}
                />
              )}
              {activeTab === 'specialists' && (
                <SpecialistsTab specialists={data?.specialists ?? []} />
              )}
              {activeTab === 'rooms' && (
                <RoomsTab rooms={data?.rooms ?? []} />
              )}
              {activeTab === 'timeline' && (
                <TimelineTab
                  specialists={data?.specialists ?? []}
                  queue={data?.queue ?? []}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
