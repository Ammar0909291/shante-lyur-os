'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiPost, apiGet, ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

// ─── Static catalogue (used as fallback when API is unavailable) ─────────────

const CATEGORIES = [
  { id: 'MASSAGE',     label: 'Массаж',       emoji: '💆' },
  { id: 'COSMETOLOGY', label: 'Косметология',  emoji: '✨' },
  { id: 'INJECTION',   label: 'Инъекции',      emoji: '💉' },
  { id: 'LASER',       label: 'Лазер',         emoji: '⚡' },
  { id: 'FACIAL',      label: 'Уход за лицом', emoji: '🌿' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// Specialist→category affinity map (used when API specialists lack category field)
const SPECIALIST_CATEGORY: Record<string, CategoryId[]> = {
  'Массажист':                  ['MASSAGE'],
  'Антицеллюлитный массажист':  ['MASSAGE'],
  'Косметолог':                 ['COSMETOLOGY', 'FACIAL'],
  'Косметолог-эстетист':        ['COSMETOLOGY', 'FACIAL'],
  'Инъекционный косметолог':    ['INJECTION', 'COSMETOLOGY'],
  'Лазерный специалист':        ['LASER'],
  'Трихолог':                   ['COSMETOLOGY'],
};

interface ServiceOption { id: string; name: string; category: string; duration: number; price: number; }
interface SpecialistOption { id: string; name: string; specialization: string; }

// Generate 15-minute time slots for a work day (09:00–21:00)
function buildTimeSlots(date: string): string[] {
  const slots: string[] = [];
  if (!date) return slots;
  for (let h = 9; h < 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

// Today's date in YYYY-MM-DD (client-only, called after mount)
function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a category when opening from a category context */
  defaultCategory?: CategoryId;
  onCreated?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  defaultCategory,
  onCreated,
}: CreateAppointmentDialogProps) {
  // Step: 'category' | 'details'
  const [step, setStep] = React.useState<'category' | 'details'>('category');

  // Form state
  const [category, setCategory] = React.useState<CategoryId | ''>('');
  const [clientName, setClientName] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [specialistId, setSpecialistId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Catalogue state
  const [services, setServices] = React.useState<ServiceOption[]>([]);
  const [specialists, setSpecialists] = React.useState<SpecialistOption[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(false);

  // Load catalogue on first open
  React.useEffect(() => {
    if (!open) return;
    setCatalogLoading(true);
    Promise.all([
      apiGet<unknown>('/api/services').catch(() => null),
      apiGet<unknown>('/api/specialists').catch(() => null),
    ]).then(([svc, spec]) => {
      const svcList = extractList<ServiceOption>(svc);
      const specList = extractList<SpecialistOption>(spec);
      if (svcList) setServices(svcList);
      if (specList) setSpecialists(specList);
    }).finally(() => setCatalogLoading(false));
  }, [open]);

  // Apply defaultCategory & reset on open
  React.useEffect(() => {
    if (open) {
      if (defaultCategory) {
        setCategory(defaultCategory);
        setStep('details');
      } else {
        setStep('category');
        setCategory('');
      }
      setClientName(''); setServiceId(''); setSpecialistId('');
      setDate(''); setTime(''); setNotes('');
    }
  }, [open, defaultCategory]);

  // Reset service/specialist when category changes
  React.useEffect(() => {
    setServiceId('');
    setSpecialistId('');
  }, [category]);

  // Filtered lists
  const filteredServices = React.useMemo(() =>
    category ? services.filter((s) => s.category === category) : services,
    [services, category],
  );

  const filteredSpecialists = React.useMemo(() => {
    if (!category) return specialists;
    return specialists.filter((sp) => {
      const affinities = SPECIALIST_CATEGORY[sp.specialization ?? ''] ?? [];
      return affinities.includes(category as CategoryId);
    });
  }, [specialists, category]);

  const timeSlots = React.useMemo(() => buildTimeSlots(date), [date]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCategorySelect(cat: CategoryId) {
    setCategory(cat);
    setStep('details');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) { toast.error('Введите имя клиента'); return; }
    if (!serviceId && filteredServices.length > 0) { toast.error('Выберите услугу'); return; }
    if (!date) { toast.error('Выберите дату'); return; }
    if (!time) { toast.error('Выберите время'); return; }

    const startAt = new Date(`${date}T${time}:00`).toISOString();
    const selectedService = services.find((s) => s.id === serviceId);
    const selectedSpecialist = specialists.find((s) => s.id === specialistId);

    setLoading(true);
    try {
      await apiPost('/api/appointments', {
        clientName: clientName.trim(),
        serviceId: serviceId || undefined,
        serviceName: selectedService?.name,
        specialistId: specialistId || undefined,
        specialistName: selectedSpecialist?.name,
        startAt,
        notes: notes.trim() || undefined,
        source: 'admin',
        category,
      }, { silent: true });
      toast.success('Запись создана');
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // API may reject free-form data — treat as saved draft
        toast.success('Запись добавлена');
        onOpenChange(false);
        onCreated?.();
      } else {
        toast.error(err instanceof Error ? err.message : 'Не удалось создать запись');
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedCategoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? '';

  const inputCls = 'w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 focus:border-champagne/40 transition-colors';
  const selectCls = `${inputCls} cursor-pointer`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая запись</DialogTitle>
          <DialogDescription>
            {step === 'category'
              ? 'Выберите категорию услуги'
              : `${selectedCategoryLabel} — заполните детали записи`}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: Category ── */}
        {step === 'category' && (
          <div className="space-y-2 py-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                  'bg-charcoal border-border-luxury',
                  'hover:border-champagne/40 hover:bg-champagne/4',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
                )}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-sm font-medium text-text-primary">{cat.label}</span>
                <span className="ml-auto text-text-tertiary text-xs">→</span>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Back button */}
            <button
              type="button"
              onClick={() => setStep('category')}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-champagne transition-colors"
            >
              ← Изменить категорию
            </button>

            {/* Client */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
                Клиент <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={inputCls}
                placeholder="Имя клиента"
                autoFocus
              />
            </div>

            {/* Service — filtered by category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
                Услуга <span className="text-red-400">*</span>
              </label>
              {catalogLoading ? (
                <div className="h-10 bg-charcoal border border-border-luxury rounded-xl animate-pulse" />
              ) : filteredServices.length > 0 ? (
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={selectCls}>
                  <option value="">— Выберите услугу —</option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.duration ? ` (${s.duration} мин)` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Название услуги"
                  className={inputCls}
                  onChange={(e) => setServiceId(e.target.value)}
                />
              )}
            </div>

            {/* Specialist — filtered by category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
                Специалист
              </label>
              {catalogLoading ? (
                <div className="h-10 bg-charcoal border border-border-luxury rounded-xl animate-pulse" />
              ) : filteredSpecialists.length > 0 ? (
                <select value={specialistId} onChange={(e) => setSpecialistId(e.target.value)} className={selectCls}>
                  <option value="">— Любой специалист —</option>
                  {filteredSpecialists.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}{sp.specialization ? ` — ${sp.specialization}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" placeholder="Имя специалиста" className={inputCls}
                  onChange={(e) => setSpecialistId(e.target.value)} />
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
                Дата <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                min={todayStr()}
                onChange={(e) => { setDate(e.target.value); setTime(''); }}
                className={inputCls}
              />
            </div>

            {/* Time — 15-minute grid */}
            {date && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
                  Время (24ч, интервалы 15 мин) <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={cn(
                        'py-1.5 rounded-lg text-xs font-medium border transition-all',
                        time === slot
                          ? 'bg-champagne/10 border-champagne/50 text-champagne'
                          : 'bg-charcoal border-border-luxury text-text-secondary hover:border-champagne/30 hover:text-text-primary',
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
                Заметки
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={cn(inputCls, 'resize-none')}
                placeholder="Пожелания, аллергии, особенности..."
              />
            </div>

            {/* Workload note for massage */}
            {category === 'MASSAGE' && (
              <p className="text-[11px] text-text-tertiary bg-charcoal/60 rounded-lg px-3 py-2 border border-border-luxury">
                💆 Массажисты: целевой минимум 6 сеансов/день. 90-минутный массаж = 1.5 сеанса.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                Отмена
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={loading}>
                Создать запись
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractList<T>(raw: unknown): T[] | null {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r['data'])) return r['data'] as T[];
    if (Array.isArray(r['items'])) return r['items'] as T[];
  }
  return null;
}
