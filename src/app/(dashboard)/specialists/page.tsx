'use client';

/**
 * Specialists management page.
 *
 * Localization note: all user-visible strings live in the LABELS constant.
 * When next-intl or similar is adopted, replace with t('specialists.page.key').
 */

import * as React from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreVertical, Edit2, UserX, RefreshCw, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getSpecialistStatusBadgeVariant, getSpecialistStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { SpecialistForm, type SpecialistRecord } from '@/components/specialists/specialist-form';
import { apiFetch } from '@/lib/api-fetch';
import { cn, pluralize } from '@/lib/utils';

// ── Localization constants ──────────────────────────────────────────────────
const LABELS = {
  pageTitle: 'Специалисты',
  pageSubtitle: 'Управление командой специалистов',
  btnAdd: 'Добавить специалиста',
  searchPlaceholder: 'Поиск по имени или специализации...',
  filterAll: 'Все',
  filterActive: 'Активные',
  filterInactive: 'Неактивные',
  filterVacation: 'В отпуске',
  filterTerminated: 'Уволены',
  colName: 'Специалист',
  colSpecialization: 'Специализация',
  colExperience: 'Опыт',
  colCommission: 'Комиссия',
  colStatus: 'Статус',
  colActions: 'Действия',
  noSpecialists: 'Специалисты не найдены',
  noSpecialistsHint: 'Добавьте первого специалиста, нажав кнопку выше',
  noResults: 'Ничего не найдено',
  noResultsHint: 'Попробуйте изменить поисковый запрос или фильтры',
  experienceYears: (n: number) => pluralize(n, 'год', 'года', 'лет'),
  commission: (rate: number) => `${Math.round(rate * 100)}%`,
  btnSchedule: 'Расписание',
  btnEdit: 'Редактировать',
  btnDeactivate: 'Деактивировать',
  btnActivate: 'Активировать',
  btnTerminate: 'Уволить',
  loadingError: 'Не удалось загрузить специалистов',
  btnRetry: 'Повторить',
  loading: 'Загрузка...',
  totalCount: (n: number) => pluralize(n, 'специалист', 'специалиста', 'специалистов'),
} as const;

// ── Status filter options ─────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ON_VACATION' | 'TERMINATED';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL',         label: LABELS.filterAll },
  { value: 'ACTIVE',      label: LABELS.filterActive },
  { value: 'INACTIVE',    label: LABELS.filterInactive },
  { value: 'ON_VACATION', label: LABELS.filterVacation },
  { value: 'TERMINATED',  label: LABELS.filterTerminated },
];

// ── Row action menu ───────────────────────────────────────────────────────────

function ActionMenu({
  specialist,
  onEdit,
  onStatusChange,
}: {
  specialist: SpecialistRecord;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
        aria-label="Действия"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden">
          <Link
            href={`/bookings?view=timeline&specialistId=${specialist.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors text-left"
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            {LABELS.btnSchedule}
          </Link>
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors text-left"
          >
            <Edit2 className="w-3.5 h-3.5 shrink-0" />
            {LABELS.btnEdit}
          </button>

          {specialist.status !== 'ACTIVE' && (
            <button
              onClick={() => { setOpen(false); onStatusChange('ACTIVE'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors text-left"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              {LABELS.btnActivate}
            </button>
          )}

          {specialist.status === 'ACTIVE' && (
            <button
              onClick={() => { setOpen(false); onStatusChange('INACTIVE'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors text-left"
            >
              <UserX className="w-3.5 h-3.5 shrink-0" />
              {LABELS.btnDeactivate}
            </button>
          )}

          {specialist.status !== 'TERMINATED' && (
            <button
              onClick={() => { setOpen(false); onStatusChange('TERMINATED'); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left border-t border-border-luxury mt-1"
            >
              <UserX className="w-3.5 h-3.5 shrink-0" />
              {LABELS.btnTerminate}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Specialist row ────────────────────────────────────────────────────────────

function SpecialistRow({
  specialist,
  onEdit,
  onStatusChange,
}: {
  specialist: SpecialistRecord;
  onEdit: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const fullName = `${specialist.firstName} ${specialist.lastName}`;

  return (
    <tr className="hover:bg-charcoal/40 transition-colors">
      {/* Name + color dot */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar name={fullName} size="sm" />
            {specialist.color && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-onyx"
                style={{ backgroundColor: specialist.color }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-text-primary text-sm truncate">{fullName}</p>
            <p className="text-xs text-text-tertiary truncate">{specialist.email}</p>
          </div>
        </div>
      </td>

      {/* Specialization */}
      <td className="px-4 py-4 text-sm text-text-secondary max-w-[180px] truncate">
        {specialist.specialization ?? '—'}
      </td>

      {/* Experience */}
      <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap tabular-nums">
        {specialist.experienceYears != null
          ? LABELS.experienceYears(specialist.experienceYears)
          : '—'}
      </td>

      {/* Commission */}
      <td className="px-4 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
        {LABELS.commission(specialist.commissionRate)}
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <Badge variant={getSpecialistStatusBadgeVariant(specialist.status)} dot>
          {getSpecialistStatusLabel(specialist.status)}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <ActionMenu
          specialist={specialist}
          onEdit={onEdit}
          onStatusChange={(status) => onStatusChange(specialist.id, status)}
        />
      </td>
    </tr>
  );
}

// ── Mobile specialist card ────────────────────────────────────────────────────

function SpecialistCard({
  specialist,
  onEdit,
  onStatusChange,
}: {
  specialist: SpecialistRecord;
  onEdit: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const fullName = `${specialist.firstName} ${specialist.lastName}`;

  return (
    <div className="px-4 py-4 border-b border-border-luxury last:border-0">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar name={fullName} size="sm" />
          {specialist.color && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-onyx"
              style={{ backgroundColor: specialist.color }}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text-primary text-sm truncate">{fullName}</p>
            <ActionMenu
              specialist={specialist}
              onEdit={onEdit}
              onStatusChange={(status) => onStatusChange(specialist.id, status)}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 truncate">
            {specialist.specialization ?? specialist.email}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={getSpecialistStatusBadgeVariant(specialist.status)} dot>
              {getSpecialistStatusLabel(specialist.status)}
            </Badge>
            <span className="text-xs text-text-tertiary">
              {LABELS.commission(specialist.commissionRate)}
            </span>
            {specialist.experienceYears != null && (
              <span className="text-xs text-text-tertiary">
                {LABELS.experienceYears(specialist.experienceYears)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = React.useState<SpecialistRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [modalMode, setModalMode] = React.useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = React.useState<SpecialistRecord | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  async function loadSpecialists() {
    setLoading(true);
    setLoadError(null);
    try {
      const url = statusFilter !== 'ALL'
        ? `/api/admin/specialists?status=${statusFilter}&limit=100`
        : '/api/admin/specialists?limit=100';
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLoadError(json.error?.message ?? LABELS.loadingError);
        return;
      }
      setSpecialists(json.data.items as SpecialistRecord[]);
    } catch {
      setLoadError(LABELS.loadingError);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadSpecialists(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side search filter
  const filtered = React.useMemo(() => {
    if (!search.trim()) return specialists;
    const q = search.toLowerCase();
    return specialists.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.specialization ?? '').toLowerCase().includes(q)
    );
  }, [specialists, search]);

  function handleSuccess(updated: SpecialistRecord) {
    setModalMode(null);
    setEditTarget(null);
    if (specialists.some(s => s.id === updated.id)) {
      // Optimistic update for edit
      setSpecialists(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
      // Prepend new specialist
      setSpecialists(prev => [updated, ...prev]);
    }
  }

  function openEdit(specialist: SpecialistRecord) {
    setEditTarget(specialist);
    setModalMode('edit');
  }

  async function quickStatusChange(id: string, status: string) {
    setStatusError(null);
    try {
      const res = await apiFetch(`/api/admin/specialists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSpecialists(prev =>
          prev.map(s => s.id === id ? { ...s, status: json.data.status, isActive: json.data.status === 'ACTIVE' } : s)
        );
      } else {
        const msg = json.error?.message ?? 'Не удалось изменить статус';
        setStatusError(msg);
        setTimeout(() => setStatusError(null), 5000);
      }
    } catch {
      setStatusError('Ошибка сети. Попробуйте ещё раз.');
      setTimeout(() => setStatusError(null), 5000);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {LABELS.pageTitle}
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            {LABELS.pageSubtitle}
            {!loading && specialists.length > 0 && (
              <span className="text-text-tertiary ml-2">
                · {LABELS.totalCount(filtered.length)}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setModalMode('create')}
        >
          {LABELS.btnAdd}
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder={LABELS.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-1 bg-charcoal rounded-lg p-1 border border-border-luxury shrink-0">
          <Filter className="w-4 h-4 text-text-tertiary mx-2 shrink-0" aria-hidden="true" />
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                statusFilter === f.value
                  ? 'bg-champagne/12 text-champagne'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/4',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline status-change error */}
      {statusError && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between gap-3"
        >
          <span>{statusError}</span>
          <button
            onClick={() => setStatusError(null)}
            className="text-red-400/60 hover:text-red-400 transition-colors text-xs"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">
            {LABELS.loading}
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-text-secondary text-sm">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadSpecialists}>
              {LABELS.btnRetry}
            </Button>
          </div>
        )}

        {/* Empty states */}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            {specialists.length === 0 ? (
              <>
                <p className="text-text-primary font-medium">{LABELS.noSpecialists}</p>
                <p className="text-text-tertiary text-sm">{LABELS.noSpecialistsHint}</p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setModalMode('create')}
                >
                  {LABELS.btnAdd}
                </Button>
              </>
            ) : (
              <>
                <p className="text-text-primary font-medium">{LABELS.noResults}</p>
                <p className="text-text-tertiary text-sm">{LABELS.noResultsHint}</p>
              </>
            )}
          </div>
        )}

        {/* Desktop table */}
        {!loading && !loadError && filtered.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  {[
                    LABELS.colName,
                    LABELS.colSpecialization,
                    LABELS.colExperience,
                    LABELS.colCommission,
                    LABELS.colStatus,
                    LABELS.colActions,
                  ].map((col, i) => (
                    <th
                      key={col}
                      className={cn(
                        'py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary',
                        i === 0 ? 'text-left px-6' : i === 5 ? 'text-right px-6' : 'text-left px-4',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {filtered.map(s => (
                  <SpecialistRow
                    key={s.id}
                    specialist={s}
                    onEdit={() => openEdit(s)}
                    onStatusChange={quickStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile list */}
        {!loading && !loadError && filtered.length > 0 && (
          <div className="sm:hidden">
            {filtered.map(s => (
              <SpecialistCard
                key={s.id}
                specialist={s}
                onEdit={() => openEdit(s)}
                onStatusChange={quickStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalMode === 'create' && (
        <SpecialistForm
          mode="create"
          onSuccess={handleSuccess}
          onClose={() => setModalMode(null)}
        />
      )}
      {modalMode === 'edit' && editTarget && (
        <SpecialistForm
          mode="edit"
          specialist={editTarget}
          onSuccess={handleSuccess}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
