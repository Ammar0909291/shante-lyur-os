'use client';

import * as React from 'react';
import { Search, Plus, Calendar, Filter } from 'lucide-react';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTime, formatCurrency, formatDateShort } from '@/lib/utils';

interface Appointment {
  id: string;
  clientId: string;
  clientName?: string;
  specialistId: string;
  specialistName?: string;
  startAt: string;
  endAt?: string;
  status: string;
  totalAmount?: number;
  services?: { name?: string }[];
  notes?: string;
}

interface ApiResponse {
  success: boolean;
  data: { items: Appointment[]; total: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'PENDING', label: 'Ожидание' },
  { value: 'CONFIRMED', label: 'Подтверждено' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
  { value: 'NO_SHOW', label: 'Не явился' },
];

export default function BookingsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/appointments?${params}`, { credentials: 'include' });
      const json: ApiResponse = await res.json();
      if (!json.success) throw new Error('Не удалось загрузить записи');
      setAppointments(json.data.items);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (a: Appointment) =>
        a.clientName?.toLowerCase().includes(q) ||
        a.specialistName?.toLowerCase().includes(q) ||
        a.services?.some((s: { name?: string }) => s.name?.toLowerCase().includes(q)),
    );
  }, [appointments, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Записи</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {total > 0 ? `Всего: ${total}` : 'Список записей'}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Новая запись
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Поиск по клиенту, специалисту или услуге..."
            leftAddon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-lg px-3 text-sm bg-charcoal border border-border-luxury text-text-primary focus:outline-none focus:border-champagne"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-tertiary">
            <span className="animate-pulse">Загрузка...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchAppointments}>
              Повторить
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Calendar className="w-10 h-10 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">Записей не найдено</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Клиент
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Услуга
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Специалист
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Дата / Время
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Статус
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {filtered.map((apt: Appointment) => {
                    const startDate = new Date(apt.startAt);
                    return (
                      <tr key={apt.id} className="hover:bg-charcoal/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={apt.clientName ?? 'К'} size="sm" />
                            <span className="font-medium text-text-primary whitespace-nowrap">
                              {apt.clientName ?? apt.clientId.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-text-secondary max-w-[180px] truncate">
                          {apt.services?.[0]?.name ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                          {apt.specialistName ?? apt.specialistId.slice(0, 8)}
                        </td>
                        <td className="px-4 py-4 text-text-secondary whitespace-nowrap tabular-nums">
                          <div>{formatDateShort(startDate)}</div>
                          <div className="text-text-tertiary text-xs">{formatTime(startDate)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                            {getAppointmentStatusLabel(apt.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-text-primary tabular-nums whitespace-nowrap">
                          {apt.totalAmount != null ? formatCurrency(apt.totalAmount) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-border-luxury">
              {filtered.map((apt: Appointment) => {
                const startDate = new Date(apt.startAt);
                return (
                  <div key={apt.id} className="px-4 py-4 flex items-start gap-3">
                    <Avatar name={apt.clientName ?? 'К'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-text-primary text-sm truncate">
                          {apt.clientName ?? apt.clientId.slice(0, 8)}
                        </span>
                        <Badge variant={getAppointmentStatusBadgeVariant(apt.status)}>
                          {getAppointmentStatusLabel(apt.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">
                        {apt.services?.[0]?.name ?? '—'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-tertiary">{formatDateShort(startDate)}</span>
                        <span className="text-xs text-text-tertiary">·</span>
                        <span className="text-xs text-text-tertiary">{formatTime(startDate)}</span>
                        {apt.totalAmount != null && (
                          <span className="text-xs font-medium text-champagne ml-auto">
                            {formatCurrency(apt.totalAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            Страница {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Назад
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
