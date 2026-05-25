'use client';

import React from 'react';
import { Trash2, Plus, CalendarClock, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Specialist {
  id: string;
  name: string;
}

interface LocationRef {
  id: string;
  name: string;
}

interface WorkingSchedule {
  id: string;
  specialistId: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  location: LocationRef;
}

interface BlockedTime {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  location: LocationRef | null;
}

interface Vacation {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
}

interface ScheduleData {
  schedules: WorkingSchedule[];
  blockedTimes: BlockedTime[];
  vacations: Vacation[];
  locations: LocationRef[];
}

type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: 'ПН',
  TUESDAY: 'ВТ',
  WEDNESDAY: 'СР',
  THURSDAY: 'ЧТ',
  FRIDAY: 'ПТ',
  SATURDAY: 'СБ',
  SUNDAY: 'ВС',
};

const DAY_FULL: Record<DayOfWeek, string> = {
  MONDAY: 'Понедельник',
  TUESDAY: 'Вторник',
  WEDNESDAY: 'Среда',
  THURSDAY: 'Четверг',
  FRIDAY: 'Пятница',
  SATURDAY: 'Суббота',
  SUNDAY: 'Воскресенье',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── AddScheduleModal ─────────────────────────────────────────────────────────

interface AddScheduleModalProps {
  specialistId: string;
  locations: LocationRef[];
  initialDay?: DayOfWeek;
  onClose: () => void;
  onSaved: () => void;
}

function AddScheduleModal({
  specialistId,
  locations,
  initialDay,
  onClose,
  onSaved,
}: AddScheduleModalProps) {
  const [locationId, setLocationId] = React.useState(locations[0]?.id ?? '');
  const [dayOfWeek, setDayOfWeek] = React.useState<DayOfWeek>(initialDay ?? 'MONDAY');
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [breakStart, setBreakStart] = React.useState('');
  const [breakEnd, setBreakEnd] = React.useState('');
  const [validFrom, setValidFrom] = React.useState(todayStr());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!locationId) { setError('Выберите локацию'); return; }
    if (!startTime || !endTime) { setError('Укажите время работы'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialistId,
          locationId,
          dayOfWeek,
          startTime,
          endTime,
          breakStart: breakStart || undefined,
          breakEnd: breakEnd || undefined,
          validFrom,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Ошибка сохранения');
        return;
      }
      onSaved();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-charcoal border border-border-luxury rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-text-primary">Добавить расписание</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Локация</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Day */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">День недели</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            >
              {DAY_ORDER.map((d) => (
                <option key={d} value={d}>{DAY_FULL[d]}</option>
              ))}
            </select>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted uppercase tracking-wide">Начало</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted uppercase tracking-wide">Конец</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
            </div>
          </div>

          {/* Break */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted uppercase tracking-wide">Перерыв (нач.)</label>
              <input
                type="time"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
                className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted uppercase tracking-wide">Перерыв (кон.)</label>
              <input
                type="time"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
                className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
            </div>
          </div>

          {/* Valid from */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Действует с</label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={busy} className="flex-1">
              {busy ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── BlockTimeModal ───────────────────────────────────────────────────────────

interface BlockTimeModalProps {
  specialistId: string;
  onClose: () => void;
  onSaved: () => void;
}

function BlockTimeModal({ specialistId, onClose, onSaved }: BlockTimeModalProps) {
  const [startAt, setStartAt] = React.useState('');
  const [endAt, setEndAt] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!startAt || !endAt) { setError('Укажите даты'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/schedule/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialistId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          reason: reason || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Ошибка сохранения');
        return;
      }
      onSaved();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-charcoal border border-border-luxury rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-text-primary">Заблокировать время</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Начало</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Конец</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Причина</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Необязательно"
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={busy} className="flex-1">
              {busy ? 'Сохранение...' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AddVacationModal ─────────────────────────────────────────────────────────

interface AddVacationModalProps {
  specialistId: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddVacationModal({ specialistId, onClose, onSaved }: AddVacationModalProps) {
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!startDate || !endDate) { setError('Укажите даты'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/schedule/vacation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialistId,
          startDate,
          endDate,
          reason: reason || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Ошибка сохранения');
        return;
      }
      onSaved();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-charcoal border border-border-luxury rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-text-primary">Добавить отпуск</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Начало</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Конец</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wide">Причина</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Необязательно"
              className="w-full bg-obsidian border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={busy} className="flex-1">
              {busy ? 'Сохранение...' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = React.useState('');
  const [scheduleData, setScheduleData] = React.useState<ScheduleData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [showAddSchedule, setShowAddSchedule] = React.useState(false);
  const [addScheduleDay, setAddScheduleDay] = React.useState<DayOfWeek | undefined>(undefined);
  const [showBlockTime, setShowBlockTime] = React.useState(false);
  const [showAddVacation, setShowAddVacation] = React.useState(false);

  // Load specialists on mount
  React.useEffect(() => {
    fetch('/api/specialists?limit=100')
      .then((r) => r.json())
      .then((json) => {
        const items: Specialist[] = json?.data?.items ?? json?.data ?? [];
        setSpecialists(items);
        if (items.length > 0) setSelectedSpecialistId(items[0].id);
      })
      .catch(() => {});
  }, []);

  // Load schedule data when specialist changes
  React.useEffect(() => {
    if (!selectedSpecialistId) return;
    setLoading(true);
    setError('');
    fetch(`/api/v1/schedule?specialistId=${selectedSpecialistId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.success) {
          setScheduleData(json.data);
        } else {
          setError(json?.error?.message ?? 'Ошибка загрузки');
        }
      })
      .catch(() => setError('Ошибка сети'))
      .finally(() => setLoading(false));
  }, [selectedSpecialistId]);

  async function reloadSchedule() {
    if (!selectedSpecialistId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/schedule?specialistId=${selectedSpecialistId}`);
      const json = await res.json();
      if (json?.success) setScheduleData(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Удалить запись расписания?')) return;
    await fetch(`/api/v1/schedule/${id}`, { method: 'DELETE' });
    await reloadSchedule();
  }

  async function deleteBlock(id: string) {
    if (!confirm('Удалить блокировку?')) return;
    await fetch(`/api/v1/schedule/block/${id}`, { method: 'DELETE' });
    await reloadSchedule();
  }

  async function approveVacation(id: string, approved: boolean) {
    await fetch(`/api/v1/schedule/vacation/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    await reloadSchedule();
  }

  const scheduleByDay = React.useMemo(() => {
    if (!scheduleData) return {} as Record<DayOfWeek, WorkingSchedule | undefined>;
    const map: Record<string, WorkingSchedule | undefined> = {};
    for (const s of scheduleData.schedules) {
      map[s.dayOfWeek] = s;
    }
    return map as Record<DayOfWeek, WorkingSchedule | undefined>;
  }, [scheduleData]);

  function openAddForDay(day: DayOfWeek) {
    setAddScheduleDay(day);
    setShowAddSchedule(true);
  }

  return (
    <div className="min-h-screen bg-obsidian p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-6 h-6 text-champagne" />
          <h1 className="text-2xl font-semibold text-text-primary">Расписание сотрудников</h1>
        </div>

        {/* Specialist selector */}
        <select
          value={selectedSpecialistId}
          onChange={(e) => setSelectedSpecialistId(e.target.value)}
          className="bg-charcoal border border-border-luxury rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40 min-w-[200px]"
        >
          {specialists.length === 0 && (
            <option value="">Нет специалистов</option>
          )}
          {specialists.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Clock className="w-4 h-4 animate-spin" />
          Загрузка...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {scheduleData && !loading && (
        <>
          {/* ── Section 1: Weekly schedule ── */}
          <section className="space-y-4">
            <h2 className="text-base font-medium text-text-secondary uppercase tracking-wide">
              Недельное расписание
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {DAY_ORDER.map((day) => {
                const entry = scheduleByDay[day];
                return (
                  <div
                    key={day}
                    className="bg-charcoal border border-border-luxury rounded-2xl p-3 flex flex-col gap-2 min-h-[120px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-champagne uppercase tracking-widest">
                        {DAY_LABEL[day]}
                      </span>
                      <button
                        onClick={() => openAddForDay(day)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-champagne/10 text-text-muted hover:text-champagne transition-colors"
                        title="Добавить"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {entry ? (
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium text-text-primary">
                          {entry.startTime} – {entry.endTime}
                        </p>
                        {entry.breakStart && entry.breakEnd && (
                          <p className="text-[10px] text-text-muted">
                            Перерыв: {entry.breakStart}–{entry.breakEnd}
                          </p>
                        )}
                        <p className="text-[10px] text-text-muted truncate">
                          {entry.location.name}
                        </p>
                        <button
                          onClick={() => deleteSchedule(entry.id)}
                          className="mt-1 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-muted flex-1 flex items-center">
                        Выходной
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Section 2: Blocked times ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-text-secondary uppercase tracking-wide">
                Блокировки
              </h2>
              <Button variant="secondary" onClick={() => setShowBlockTime(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Добавить блокировку
              </Button>
            </div>

            {scheduleData.blockedTimes.length === 0 ? (
              <div className="rounded-xl border border-border-luxury bg-charcoal px-4 py-6 text-center text-sm text-text-muted">
                Нет предстоящих блокировок
              </div>
            ) : (
              <div className="space-y-2">
                {scheduleData.blockedTimes.map((bt) => (
                  <div
                    key={bt.id}
                    className="flex items-center justify-between bg-charcoal border border-border-luxury rounded-xl px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm text-text-primary">
                        {fmtDateTime(bt.startAt)} – {fmtDateTime(bt.endAt)}
                      </p>
                      {bt.reason && (
                        <p className="text-xs text-text-muted">{bt.reason}</p>
                      )}
                      {bt.location && (
                        <p className="text-xs text-text-muted">{bt.location.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBlock(bt.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-900/10 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Section 3: Vacations ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-text-secondary uppercase tracking-wide">
                Отпуска
              </h2>
              <Button variant="secondary" onClick={() => setShowAddVacation(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Добавить отпуск
              </Button>
            </div>

            {scheduleData.vacations.length === 0 ? (
              <div className="rounded-xl border border-border-luxury bg-charcoal px-4 py-6 text-center text-sm text-text-muted">
                Нет отпусков
              </div>
            ) : (
              <div className="space-y-2">
                {scheduleData.vacations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between bg-charcoal border border-border-luxury rounded-xl px-4 py-3 gap-4"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        {fmtDate(v.startDate)} – {fmtDate(v.endDate)}
                      </p>
                      {v.reason && (
                        <p className="text-xs text-text-muted truncate">{v.reason}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {v.isApproved ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border',
                            'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
                          )}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Одобрен
                        </span>
                      ) : (
                        <>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border',
                              'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            На рассмотрении
                          </span>
                          <button
                            onClick={() => approveVacation(v.id, true)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-900/10 transition-colors"
                            title="Одобрить"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => approveVacation(v.id, false)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-900/10 transition-colors"
                            title="Отклонить"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      {showAddSchedule && selectedSpecialistId && scheduleData && (
        <AddScheduleModal
          specialistId={selectedSpecialistId}
          locations={scheduleData.locations}
          initialDay={addScheduleDay}
          onClose={() => { setShowAddSchedule(false); setAddScheduleDay(undefined); }}
          onSaved={() => { setShowAddSchedule(false); setAddScheduleDay(undefined); reloadSchedule(); }}
        />
      )}

      {showBlockTime && selectedSpecialistId && (
        <BlockTimeModal
          specialistId={selectedSpecialistId}
          onClose={() => setShowBlockTime(false)}
          onSaved={() => { setShowBlockTime(false); reloadSchedule(); }}
        />
      )}

      {showAddVacation && selectedSpecialistId && (
        <AddVacationModal
          specialistId={selectedSpecialistId}
          onClose={() => setShowAddVacation(false)}
          onSaved={() => { setShowAddVacation(false); reloadSchedule(); }}
        />
      )}
    </div>
  );
}
