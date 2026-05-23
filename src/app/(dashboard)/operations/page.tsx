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
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useLocale } from '@/components/providers/locale-provider';

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
  activeCount: number;
  completedToday: number;
  nextFree?: string;
  status: 'available' | 'busy' | 'break';
}

const MOCK_QUEUE: QueueItem[] = [
  {
    id: '1',
    status: 'CONFIRMED',
    startTime: new Date(Date.now() - 20 * 60000).toISOString(),
    endTime: new Date(Date.now() + 40 * 60000).toISOString(),
    customer: { user: { name: 'Анна Михайлова' } },
    specialist: { user: { name: 'Наталья Владимирова' } },
    service: { name: 'Тайский массаж', durationMinutes: 60 },
  },
  {
    id: '2',
    status: 'PENDING',
    startTime: new Date(Date.now() + 10 * 60000).toISOString(),
    endTime: new Date(Date.now() + 70 * 60000).toISOString(),
    customer: { user: { name: 'Светлана Козлова' } },
    specialist: { user: { name: 'Мария Волкова' } },
    service: { name: 'Биоревитализация', durationMinutes: 60 },
  },
  {
    id: '3',
    status: 'CONFIRMED',
    startTime: new Date(Date.now() + 30 * 60000).toISOString(),
    endTime: new Date(Date.now() + 120 * 60000).toISOString(),
    customer: { user: { name: 'Ольга Новикова' } },
    specialist: { user: { name: 'Ирина Соколова' } },
    service: { name: 'Химический пилинг', durationMinutes: 45 },
  },
  {
    id: '4',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 90 * 60000).toISOString(),
    endTime: new Date(Date.now() - 30 * 60000).toISOString(),
    customer: { user: { name: 'Татьяна Волкова' } },
    specialist: { user: { name: 'Дарья Соколова' } },
    service: { name: 'Горячий камень (стоун)', durationMinutes: 60 },
  },
  {
    id: '5',
    status: 'CONFIRMED',
    startTime: new Date(Date.now() + 60 * 60000).toISOString(),
    endTime: new Date(Date.now() + 150 * 60000).toISOString(),
    customer: { user: { name: 'Наталья Морозова' } },
    specialist: { user: { name: 'Ольга Козлова' } },
    service: { name: 'Глубокотканный массаж', durationMinutes: 90 },
  },
];

const MOCK_SPECIALISTS: SpecialistLoad[] = [
  { id: 's1', name: 'Наталья Владимирова', activeCount: 1, completedToday: 3, nextFree: new Date(Date.now() + 40 * 60000).toISOString(), status: 'busy' },
  { id: 's2', name: 'Ольга Козлова', activeCount: 1, completedToday: 2, nextFree: new Date(Date.now() + 90 * 60000).toISOString(), status: 'busy' },
  { id: 's3', name: 'Мария Волкова', activeCount: 0, completedToday: 4, status: 'available' },
  { id: 's4', name: 'Ирина Соколова', activeCount: 0, completedToday: 1, status: 'break' },
  { id: 's5', name: 'Дарья Соколова', activeCount: 0, completedToday: 3, status: 'available' },
];

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
  if (status === 'busy') return 'Занят';
  return 'Перерыв';
}

export default function OperationsPage() {
  const { t } = useLocale();
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [specialists, setSpecialists] = React.useState<SpecialistLoad[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(new Date());
  const [actingId, setActingId] = React.useState<string | null>(null);

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

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Сейчас в работе', value: loading ? '—' : String(activeNow.length), color: 'text-blue-400' },
          { label: 'Ожидают', value: loading ? '—' : String(upcoming.length), color: 'text-amber-400' },
          { label: 'Завершено сегодня', value: loading ? '—' : String(recentCompleted.length), color: 'text-sage' },
          { label: 'Мастеров онлайн', value: loading ? '—' : String(specialists.filter(s => s.status !== 'break').length), color: 'text-champagne' },
        ].map((stat) => (
          <div key={stat.label} className="bg-onyx border border-border-luxury rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">{stat.label}</p>
            <p className={cn('font-serif text-3xl font-medium', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

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
                  <Avatar name={spec.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{spec.name}</p>
                    <p className={cn('text-xs mt-0.5', getSpecialistStatusColor(spec.status))}>
                      {getSpecialistStatusLabel(spec.status)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {spec.completedToday} завершено сегодня
                    </p>
                    {spec.nextFree && spec.status === 'busy' && (
                      <p className="text-xs text-text-tertiary">
                        Свободен в {formatTime(spec.nextFree)}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5 shrink-0',
                    spec.status === 'available' ? 'bg-sage' : spec.status === 'busy' ? 'bg-amber-400' : 'bg-border-light',
                  )} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
