'use client';

import * as React from 'react';
import {
  Clock,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Zap,
  X,
  Play,
  DoorOpen,
  Sparkles,
  Leaf,
  Bell,
  BellOff,
  Timer,
  ChevronRight,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useLocale } from '@/components/providers/locale-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomStatus = 'occupied' | 'cleaning' | 'free';
type ServiceCategory = 'massage' | 'cosmetology';

interface RoomSession {
  clientName: string;
  specialistName: string;
  serviceName: string;
  category: ServiceCategory;
  startTime: Date;
  endTime: Date;
}

interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  session?: RoomSession;
  nextStart?: Date;
  nextClientName?: string;
  nextServiceName?: string;
  cleaningStarted?: Date;
}

interface QueueItem {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  customer?: { user: { name: string } };
  specialist?: { user: { name: string } };
  service?: { name: string; durationMinutes: number };
}

interface SpecialistLoad {
  id: string;
  name: string;
  type: 'massage' | 'cosmetology';
  activeCount: number;
  completedToday: number;
  nextFree?: string;
  status: 'available' | 'busy' | 'break';
}

interface Alert {
  id: string;
  level: 'warning' | 'info' | 'error';
  message: string;
  time: string;
  dismissed?: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const now0 = new Date();

const MOCK_ROOMS: Room[] = [
  {
    id: 'r1',
    name: 'Кабинет 1',
    status: 'occupied',
    session: {
      clientName: 'Анна Михайлова',
      specialistName: 'Наталья Владимирова',
      serviceName: 'Тайский массаж',
      category: 'massage',
      startTime: new Date(now0.getTime() - 20 * 60000),
      endTime: new Date(now0.getTime() + 40 * 60000),
    },
  },
  {
    id: 'r2',
    name: 'Кабинет 2',
    status: 'occupied',
    session: {
      clientName: 'Ирина Белова',
      specialistName: 'Мария Волкова',
      serviceName: 'Биоревитализация',
      category: 'cosmetology',
      startTime: new Date(now0.getTime() - 5 * 60000),
      endTime: new Date(now0.getTime() + 55 * 60000),
    },
  },
  {
    id: 'r3',
    name: 'Кабинет 3',
    status: 'cleaning',
    cleaningStarted: new Date(now0.getTime() - 8 * 60000),
    nextStart: new Date(now0.getTime() + 22 * 60000),
    nextClientName: 'Светлана Козлова',
    nextServiceName: 'Химический пилинг',
  },
  {
    id: 'r4',
    name: 'Кабинет 4',
    status: 'free',
    nextStart: new Date(now0.getTime() + 35 * 60000),
    nextClientName: 'Ольга Новикова',
    nextServiceName: 'Глубокотканный массаж',
  },
  {
    id: 'r5',
    name: 'Кабинет 5',
    status: 'free',
    nextStart: new Date(now0.getTime() + 80 * 60000),
    nextClientName: 'Наталья Морозова',
    nextServiceName: 'Антивозрастной уход',
  },
];

const MOCK_QUEUE: QueueItem[] = [
  {
    id: '1',
    status: 'CONFIRMED',
    startTime: new Date(now0.getTime() - 20 * 60000).toISOString(),
    endTime: new Date(now0.getTime() + 40 * 60000).toISOString(),
    customer: { user: { name: 'Анна Михайлова' } },
    specialist: { user: { name: 'Наталья Владимирова' } },
    service: { name: 'Тайский массаж', durationMinutes: 60 },
  },
  {
    id: '2',
    status: 'CONFIRMED',
    startTime: new Date(now0.getTime() - 5 * 60000).toISOString(),
    endTime: new Date(now0.getTime() + 55 * 60000).toISOString(),
    customer: { user: { name: 'Ирина Белова' } },
    specialist: { user: { name: 'Мария Волкова' } },
    service: { name: 'Биоревитализация', durationMinutes: 60 },
  },
  {
    id: '3',
    status: 'PENDING',
    startTime: new Date(now0.getTime() + 22 * 60000).toISOString(),
    endTime: new Date(now0.getTime() + 67 * 60000).toISOString(),
    customer: { user: { name: 'Светлана Козлова' } },
    specialist: { user: { name: 'Ирина Соколова' } },
    service: { name: 'Химический пилинг', durationMinutes: 45 },
  },
  {
    id: '4',
    status: 'CONFIRMED',
    startTime: new Date(now0.getTime() + 35 * 60000).toISOString(),
    endTime: new Date(now0.getTime() + 125 * 60000).toISOString(),
    customer: { user: { name: 'Ольга Новикова' } },
    specialist: { user: { name: 'Ольга Козлова' } },
    service: { name: 'Глубокотканный массаж', durationMinutes: 90 },
  },
  {
    id: '5',
    status: 'COMPLETED',
    startTime: new Date(now0.getTime() - 100 * 60000).toISOString(),
    endTime: new Date(now0.getTime() - 40 * 60000).toISOString(),
    customer: { user: { name: 'Татьяна Волкова' } },
    specialist: { user: { name: 'Дарья Соколова' } },
    service: { name: 'Горячий камень (стоун)', durationMinutes: 60 },
  },
  {
    id: '6',
    status: 'COMPLETED',
    startTime: new Date(now0.getTime() - 180 * 60000).toISOString(),
    endTime: new Date(now0.getTime() - 120 * 60000).toISOString(),
    customer: { user: { name: 'Юлия Морева' } },
    specialist: { user: { name: 'Наталья Владимирова' } },
    service: { name: 'Ароматерапевтический массаж', durationMinutes: 60 },
  },
  {
    id: '7',
    status: 'CONFIRMED',
    startTime: new Date(now0.getTime() + 80 * 60000).toISOString(),
    endTime: new Date(now0.getTime() + 170 * 60000).toISOString(),
    customer: { user: { name: 'Наталья Морозова' } },
    specialist: { user: { name: 'Мария Волкова' } },
    service: { name: 'Антивозрастной уход', durationMinutes: 90 },
  },
];

const MOCK_SPECIALISTS: SpecialistLoad[] = [
  { id: 's1', name: 'Наталья Владимирова', type: 'massage', activeCount: 1, completedToday: 3, nextFree: new Date(now0.getTime() + 40 * 60000).toISOString(), status: 'busy' },
  { id: 's2', name: 'Ольга Козлова', type: 'massage', activeCount: 0, completedToday: 2, nextFree: new Date(now0.getTime() + 35 * 60000).toISOString(), status: 'available' },
  { id: 's3', name: 'Дарья Соколова', type: 'massage', activeCount: 0, completedToday: 3, status: 'available' },
  { id: 's4', name: 'Мария Волкова', type: 'cosmetology', activeCount: 1, completedToday: 2, nextFree: new Date(now0.getTime() + 55 * 60000).toISOString(), status: 'busy' },
  { id: 's5', name: 'Ирина Соколова', type: 'cosmetology', activeCount: 0, completedToday: 1, status: 'break' },
];

const MOCK_ALERTS: Alert[] = [
  { id: 'a1', level: 'warning', message: 'Светлана Козлова не подтвердила запись (Химический пилинг, через 22 мин)', time: '5 мин назад' },
  { id: 'a2', level: 'info', message: 'Кабинет 3 ожидает подготовки перед следующим приёмом', time: '8 мин назад' },
  { id: 'a3', level: 'info', message: 'Наталья Владимирова — 3 сеанса завершены, нагрузка высокая', time: '40 мин назад' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m <= 0) return 'сейчас';
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} ч ${rem} мин` : `${h} ч`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />;
  if (status === 'CONFIRMED') return <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />;
  if (status === 'CANCELLED') return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
  return <Circle className="w-4 h-4 text-amber-400 shrink-0" />;
}

function getSpecialistStatusColor(status: SpecialistLoad['status']) {
  if (status === 'available') return 'text-sage';
  if (status === 'busy') return 'text-amber-400';
  return 'text-text-tertiary';
}

function getSpecialistStatusLabel(status: SpecialistLoad['status']) {
  if (status === 'available') return 'Свободен';
  if (status === 'busy') return 'В работе';
  return 'Перерыв';
}

// ─── Room Card ─────────────────────────────────────────────────────────────────

function RoomCard({ room, now }: { room: Room; now: Date }) {
  const remaining = room.session
    ? room.session.endTime.getTime() - now.getTime()
    : null;
  const totalDuration = room.session
    ? room.session.endTime.getTime() - room.session.startTime.getTime()
    : null;
  const elapsed = room.session
    ? now.getTime() - room.session.startTime.getTime()
    : null;
  const progressPct = totalDuration && elapsed !== null
    ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
    : 0;

  const cleaningElapsed = room.cleaningStarted
    ? now.getTime() - room.cleaningStarted.getTime()
    : null;

  const isOccupied = room.status === 'occupied';
  const isCleaning = room.status === 'cleaning';
  const isFree = room.status === 'free';

  return (
    <div className={cn(
      'relative rounded-2xl border p-4 flex flex-col gap-3 overflow-hidden transition-all',
      isOccupied
        ? 'bg-onyx border-amber-500/30'
        : isCleaning
          ? 'bg-onyx border-blue-400/25'
          : 'bg-onyx border-border-luxury',
    )}>
      {/* Status glow strip */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl',
        isOccupied
          ? room.session?.category === 'cosmetology' ? 'luxury-gradient' : 'bg-sage'
          : isCleaning
            ? 'bg-blue-400/60'
            : 'bg-border-luxury',
      )} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className={cn('w-4 h-4 shrink-0',
            isOccupied ? 'text-amber-400' : isCleaning ? 'text-blue-400' : 'text-text-tertiary',
          )} />
          <span className="text-sm font-semibold text-text-primary">{room.name}</span>
        </div>
        <span className={cn(
          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
          isOccupied
            ? 'bg-amber-400/15 text-amber-300'
            : isCleaning
              ? 'bg-blue-400/15 text-blue-300'
              : 'bg-sage/15 text-sage',
        )}>
          {isOccupied ? 'Занят' : isCleaning ? 'Уборка' : 'Свободен'}
        </span>
      </div>

      {/* Body */}
      {isOccupied && room.session && (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            {room.session.category === 'cosmetology'
              ? <Sparkles className="w-3.5 h-3.5 text-champagne shrink-0 mt-0.5" />
              : <Leaf className="w-3.5 h-3.5 text-sage shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary leading-tight">{room.session.serviceName}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{room.session.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{room.session.specialistName}</span>
          </div>
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">
                {formatTime(room.session.startTime.toISOString())} – {formatTime(room.session.endTime.toISOString())}
              </span>
              <span className={cn('font-medium', remaining !== null && remaining < 10 * 60000 ? 'text-amber-300' : 'text-text-secondary')}>
                {remaining !== null && remaining > 0
                  ? `ещё ${formatMinutes(remaining)}`
                  : 'завершается'}
              </span>
            </div>
            <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  room.session.category === 'cosmetology' ? 'luxury-gradient' : 'bg-sage',
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {isCleaning && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Timer className="w-3.5 h-3.5 text-blue-400 animate-pulse shrink-0" />
            <span>
              Уборка {cleaningElapsed !== null ? formatMinutes(cleaningElapsed) : '…'}
            </span>
          </div>
          {room.nextStart && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <ChevronRight className="w-3 h-3 shrink-0 text-champagne" />
              <span className="truncate">
                Следующий: {room.nextClientName} · {room.nextServiceName}
              </span>
            </div>
          )}
          {room.nextStart && (
            <p className="text-xs text-champagne font-medium">
              Через {formatMinutes(room.nextStart.getTime() - now.getTime())}
            </p>
          )}
        </div>
      )}

      {isFree && (
        <div className="space-y-1.5">
          {room.nextStart ? (
            <>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <ChevronRight className="w-3 h-3 shrink-0 text-champagne" />
                <span className="truncate">{room.nextClientName} · {room.nextServiceName}</span>
              </div>
              <p className="text-xs text-champagne font-medium">
                Через {formatMinutes(room.nextStart.getTime() - now.getTime())}
              </p>
            </>
          ) : (
            <p className="text-xs text-text-tertiary">Записей нет</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { t } = useLocale();
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [specialists, setSpecialists] = React.useState<SpecialistLoad[]>([]);
  const [rooms] = React.useState<Room[]>(MOCK_ROOMS);
  const [alerts, setAlerts] = React.useState<Alert[]>(MOCK_ALERTS);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(new Date());
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [alertsMuted, setAlertsMuted] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const load = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        const items: QueueItem[] = Array.isArray(data) ? data : data.appointments ?? [];
        setQueue(items.length > 0 ? items : MOCK_QUEUE);
      } else {
        setQueue(MOCK_QUEUE);
      }
    } catch {
      setQueue(MOCK_QUEUE);
    } finally {
      setSpecialists(MOCK_SPECIALISTS);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleQueueAction = React.useCallback(async (id: string, status: string) => {
    setActingId(id);
    setQueue((prev) => prev.map((q) => q.id === id ? { ...q, status } : q));
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch { /* keep optimistic state */ } finally {
      setActingId(null);
    }
  }, []);

  const dismissAlert = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const activeNow = queue.filter(
    (q) => q.status === 'CONFIRMED' && new Date(q.startTime) <= now && new Date(q.endTime) >= now,
  );
  const upcoming = queue
    .filter((q) => q.status !== 'COMPLETED' && q.status !== 'CANCELLED' && new Date(q.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const recentCompleted = queue
    .filter((q) => q.status === 'COMPLETED')
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    .slice(0, 5);

  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">
            {t('nav.operations')}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Живая очередь · {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAlertsMuted((v) => !v)}
            title={alertsMuted ? 'Включить уведомления' : 'Отключить уведомления'}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center border transition-all',
              alertsMuted
                ? 'bg-charcoal border-border-luxury text-text-tertiary'
                : 'bg-amber-400/10 border-amber-400/20 text-amber-300',
            )}
          >
            {alertsMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
              'bg-charcoal border border-border-luxury text-text-secondary',
              'hover:text-text-primary hover:border-border-light transition-all',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Обновить
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Кабинеты заняты', value: loading ? '—' : `${occupiedRooms} / ${rooms.length}`, color: 'text-amber-400' },
          { label: 'Сейчас в работе', value: loading ? '—' : String(activeNow.length), color: 'text-blue-400' },
          { label: 'Ожидают', value: loading ? '—' : String(upcoming.length), color: 'text-champagne' },
          { label: 'Завершено сегодня', value: loading ? '—' : String(recentCompleted.length), color: 'text-sage' },
        ].map((stat) => (
          <div key={stat.label} className="bg-onyx border border-border-luxury rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">{stat.label}</p>
            <p className={cn('font-serif text-3xl font-medium', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Room Occupancy Grid */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
          <DoorOpen className="w-4 h-4 text-champagne" />
          <h2 className="text-sm font-semibold text-text-primary">Состояние кабинетов</h2>
          <span className="ml-auto text-xs text-text-tertiary">
            {occupiedRooms} занято · {rooms.filter((r) => r.status === 'cleaning').length} уборка · {rooms.filter((r) => r.status === 'free').length} свободно
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-40 bg-charcoal rounded-2xl animate-shimmer" />
            ))
            : rooms.map((room) => <RoomCard key={room.id} room={room} now={now} />)
          }
        </div>
      </div>

      {/* Alerts */}
      {!alertsMuted && !loading && activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
                alert.level === 'warning'
                  ? 'bg-amber-400/8 border-amber-400/25 text-amber-200'
                  : alert.level === 'error'
                    ? 'bg-red-500/8 border-red-500/25 text-red-300'
                    : 'bg-blue-400/8 border-blue-400/20 text-blue-200',
              )}
            >
              <AlertCircle className={cn('w-4 h-4 shrink-0 mt-0.5',
                alert.level === 'warning' ? 'text-amber-400' : alert.level === 'error' ? 'text-red-400' : 'text-blue-400',
              )} />
              <div className="flex-1 min-w-0">
                <span>{alert.message}</span>
                <span className="ml-2 text-xs opacity-60">{alert.time}</span>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Queue */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Now */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
              <Zap className="w-4 h-4 text-champagne" />
              <h2 className="text-sm font-semibold text-text-primary">Сейчас в работе</h2>
              <span className="ml-auto text-xs text-text-tertiary">{activeNow.length} активных</span>
            </div>
            <div className="divide-y divide-border-luxury">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-charcoal animate-shimmer shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-charcoal rounded animate-shimmer" />
                      <div className="h-3 w-32 bg-charcoal rounded animate-shimmer" />
                    </div>
                  </div>
                ))
              ) : activeNow.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-text-tertiary">
                  Нет активных сеансов
                </div>
              ) : (
                activeNow.map((item) => {
                  const remaining = Math.round((new Date(item.endTime).getTime() - now.getTime()) / 60000);
                  return (
                    <div key={item.id} className="px-5 py-4 flex items-start gap-3 group">
                      <StatusIcon status={item.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">
                            {item.customer?.user.name ?? 'Клиент'}
                          </span>
                          <span className="text-xs text-text-tertiary">→</span>
                          <span className="text-sm text-text-secondary">{item.service?.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{item.specialist?.user.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {remaining > 0 ? `Ещё ${remaining} мин` : 'Завершается'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <p className="text-xs text-text-primary font-medium">{formatTime(item.startTime)}</p>
                        <p className="text-xs text-text-tertiary">{formatTime(item.endTime)}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                          <button
                            onClick={() => handleQueueAction(item.id, 'COMPLETED')}
                            disabled={actingId === item.id}
                            title="Завершить сеанс"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20 transition-colors disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3 h-3" />Завершить
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
              <Clock className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-primary">Предстоящие</h2>
              <span className="ml-auto text-xs text-text-tertiary">{upcoming.length} записей</span>
            </div>
            <div className="divide-y divide-border-luxury">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-12 h-4 bg-charcoal rounded animate-shimmer shrink-0" />
                    <div className="flex-1 h-4 bg-charcoal rounded animate-shimmer" />
                  </div>
                ))
              ) : upcoming.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-text-tertiary">
                  Нет предстоящих записей
                </div>
              ) : (
                upcoming.slice(0, 8).map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-3 group">
                    <span className="text-sm font-medium text-champagne w-12 shrink-0">
                      {formatTime(item.startTime)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary truncate block">
                        {item.customer?.user.name ?? 'Клиент'}
                      </span>
                      <span className="text-xs text-text-tertiary truncate block">{item.service?.name}</span>
                    </div>
                    <Badge variant={getAppointmentStatusBadgeVariant(item.status)}>
                      {getAppointmentStatusLabel(item.status)}
                    </Badge>
                    {item.status === 'PENDING' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleQueueAction(item.id, 'CONFIRMED')}
                          disabled={actingId === item.id}
                          title="Подтвердить"
                          className="w-7 h-7 rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20 flex items-center justify-center transition-colors disabled:opacity-40"
                        ><Play className="w-3 h-3" /></button>
                        <button
                          onClick={() => handleQueueAction(item.id, 'CANCELLED')}
                          disabled={actingId === item.id}
                          title="Отменить"
                          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
                        ><X className="w-3 h-3" /></button>
                      </div>
                    )}
                    {item.status === 'CONFIRMED' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleQueueAction(item.id, 'COMPLETED')}
                          disabled={actingId === item.id}
                          title="Завершить"
                          className="w-7 h-7 rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20 flex items-center justify-center transition-colors disabled:opacity-40"
                        ><CheckCircle2 className="w-3 h-3" /></button>
                        <button
                          onClick={() => handleQueueAction(item.id, 'CANCELLED')}
                          disabled={actingId === item.id}
                          title="Отменить"
                          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
                        ><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Completed */}
          {!loading && recentCompleted.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
                <CheckCircle2 className="w-4 h-4 text-sage" />
                <h2 className="text-sm font-semibold text-text-primary">Недавно завершены</h2>
              </div>
              <div className="divide-y divide-border-luxury">
                {recentCompleted.map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-4 opacity-70">
                    <span className="text-sm text-text-tertiary w-12 shrink-0">
                      {formatTime(item.endTime)}
                    </span>
                    <span className="text-sm text-text-secondary flex-1 truncate">
                      {item.customer?.user.name} · {item.service?.name}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Specialist Workload */}
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden h-fit">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
            <User className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">Мастера</h2>
          </div>
          <div className="divide-y divide-border-luxury">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-charcoal animate-shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 bg-charcoal rounded animate-shimmer" />
                    <div className="h-3 w-20 bg-charcoal rounded animate-shimmer" />
                  </div>
                </div>
              ))
            ) : (
              specialists.map((spec) => (
                <div key={spec.id} className="px-5 py-4 flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Avatar name={spec.name} size="sm" />
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-onyx',
                      spec.status === 'available' ? 'bg-sage' : spec.status === 'busy' ? 'bg-amber-400' : 'bg-border-light',
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{spec.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {spec.type === 'cosmetology'
                        ? <Sparkles className="w-3 h-3 text-champagne shrink-0" />
                        : <Leaf className="w-3 h-3 text-sage shrink-0" />}
                      <p className={cn('text-xs', getSpecialistStatusColor(spec.status))}>
                        {getSpecialistStatusLabel(spec.status)}
                      </p>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      {spec.completedToday} завершено сегодня
                    </p>
                    {spec.nextFree && spec.status === 'busy' && (
                      <p className="text-xs text-text-tertiary">
                        Свободен в {formatTime(spec.nextFree)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
