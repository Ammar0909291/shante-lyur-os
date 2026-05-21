'use client';

import * as React from 'react';
import { X, Search } from 'lucide-react';

interface Specialist {
  id: string;
  userId: string;
  name: string;
  specialization: string | null;
  allowedServiceIds: string[];
  specialistType: 'MASSAGE' | 'COSMETOLOGY';
}
interface Service { id: string; name: string; basePrice: number; baseDuration: number; category: string; isActive?: boolean; }
interface Location { id: string; name: string; }
interface ClientResult { id: string; firstName: string; lastName: string; email: string; phone: string | null; }

interface RecordSaleModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50';
const selectCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50';

export function RecordSaleModal({ onClose, onSaved }: RecordSaleModalProps) {
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [defaultLocationId, setDefaultLocationId] = React.useState('');
  const [defaultLocationName, setDefaultLocationName] = React.useState('');

  const [clientQuery, setClientQuery] = React.useState('');
  const [clientResults, setClientResults] = React.useState<ClientResult[]>([]);
  const [clientDropdown, setClientDropdown] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientResult | null>(null);

  const [specialistId, setSpecialistId] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [startAt, setStartAt] = React.useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [priceOverride, setPriceOverride] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [conflictSlots, setConflictSlots] = React.useState<string[]>([]);
  const [allowOverlap, setAllowOverlap] = React.useState(false);

  const debouncedQuery = useDebounce(clientQuery, 250);

  // Load reference data on mount
  React.useEffect(() => {
    Promise.all([
      fetch('/api/specialists?limit=100&status=ACTIVE', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/services', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/locations', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([sp, sv, loc]) => {
      if (sp.success) {
        setSpecialists(
          (sp.data?.items ?? sp.data ?? []).map((s: {
            id: string; userId: string; firstName: string; lastName: string;
            specialization?: string | null; allowedServiceIds?: string[];
            specialistType?: 'MASSAGE' | 'COSMETOLOGY';
          }) => ({
            id: s.id,
            userId: s.userId,
            name: `${s.firstName} ${s.lastName}`.trim(),
            specialization: s.specialization ?? null,
            allowedServiceIds: s.allowedServiceIds ?? [],
            specialistType: s.specialistType ?? 'COSMETOLOGY',
          }))
        );
      }
      if (sv.success) {
        setServices(
          (sv.data?.items ?? sv.data ?? [])
            .filter((s: { isActive?: boolean }) => s.isActive !== false)
            .map((s: { id: string; name: string; basePrice: number; baseDuration: number; category: string }) => ({
              id: s.id, name: s.name, basePrice: s.basePrice, baseDuration: s.baseDuration, category: s.category,
            }))
        );
      }
      if (loc.success) {
        const locs: Location[] = loc.data?.items ?? loc.data ?? [];
        if (locs.length > 0) {
          setDefaultLocationId(locs[0].id);
          setDefaultLocationName(locs[0].name);
        }
      }
    }).catch(() => {});
  }, []);

  // Client search
  React.useEffect(() => {
    if (!debouncedQuery.trim()) { setClientResults([]); return; }
    fetch(`/api/clients/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClientResults(json.data?.items ?? []);
      })
      .catch(() => {});
  }, [debouncedQuery]);

  const selectedSpecialistObj = specialists.find((s) => s.id === specialistId);

  // Filter services by specialist type: MASSAGIST sees only MASSAGE, COSMETOLOGIST sees only COSMETOLOGY
  const filteredServices = React.useMemo(() => {
    if (!selectedSpecialistObj) return services;
    return services.filter((s) => s.category === selectedSpecialistObj.specialistType);
  }, [selectedSpecialistObj, services]);

  const selectedService = services.find((s) => s.id === serviceId);
  const baseTotal = selectedService ? selectedService.basePrice * quantity : 0;
  const effectivePrice = priceOverride !== '' ? parseFloat(priceOverride) : baseTotal;

  function selectClient(c: ClientResult) {
    setSelectedClient(c);
    setClientQuery(`${c.firstName} ${c.lastName}`);
    setClientDropdown(false);
    setClientResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setConflictSlots([]);

    if (!selectedClient) { setError('Выберите клиента'); return; }
    if (!specialistId) { setError('Выберите продавца'); return; }
    if (!serviceId) { setError('Выберите услугу'); return; }
    if (!defaultLocationId) { setError('Не удалось определить локацию. Обновите страницу.'); return; }
    if (!startAt) { setError('Укажите дату и время'); return; }
    if (isNaN(effectivePrice) || effectivePrice < 0) { setError('Некорректная цена'); return; }

    setSaving(true);
    try {
      const service = services.find((s) => s.id === serviceId)!;
      const pricePerUnit = quantity > 1
        ? Math.round((effectivePrice / quantity) * 100) / 100
        : effectivePrice;
      const serviceEntries = Array.from({ length: quantity }, (_, i) => ({
        serviceId,
        price: pricePerUnit,
        duration: service.baseDuration,
        sortOrder: i,
      }));

      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: selectedClient.id,
          specialistId,
          locationId: defaultLocationId,
          startAt: new Date(startAt).toISOString(),
          services: serviceEntries,
          notes: notes.trim() || undefined,
          source: 'admin',
          allowOverlap,
        }),
      });

      const json = await res.json() as {
        success: boolean;
        error?: { code?: string; message?: string; details?: { nextAvailableSlots?: string[] } };
      };
      if (!res.ok || !json.success) {
        if (json.error?.code === 'CONFLICT') {
          setConflictSlots(json.error?.details?.nextAvailableSlots ?? []);
        }
        setError(json.error?.message ?? 'Ошибка при записи');
        return;
      }

      onSaved();
    } catch {
      setError('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  }

  function applyConflictSlot(isoSlot: string) {
    const d = new Date(isoSlot);
    // datetime-local value format: "YYYY-MM-DDTHH:mm" (local time)
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
      .toISOString().slice(0, 16);
    setStartAt(local);
    setError(''); setConflictSlots([]); setAllowOverlap(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-obsidian border border-border-luxury rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h3 className="font-serif text-lg font-medium text-text-primary">Записать продажу</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Client */}
          <div className="relative">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Клиент *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input
                value={clientQuery}
                onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null); setClientDropdown(true); }}
                onFocus={() => setClientDropdown(true)}
                onBlur={() => setTimeout(() => setClientDropdown(false), 150)}
                placeholder="Поиск по имени или email..."
                disabled={saving}
                className={`${inputCls} pl-9`}
              />
            </div>
            {clientDropdown && clientResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian border border-border-luxury rounded-xl shadow-xl z-10 overflow-hidden">
                {clientResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => selectClient(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-charcoal transition-colors"
                  >
                    <p className="text-sm font-medium text-text-primary">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-text-tertiary">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seller */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Продавец *</label>
            <select
              value={specialistId}
              onChange={(e) => { setSpecialistId(e.target.value); setServiceId(''); setPriceOverride(''); }}
              disabled={saving}
              className={selectCls}
            >
              <option value="">Выберите продавца</option>
              {specialists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.specialization ? ` — ${s.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Service — filtered by specialist's allowed list */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Услуга *</label>
            {specialistId && filteredServices.length === 0 ? (
              <div className="px-3 py-2.5 rounded-xl border border-border-luxury bg-charcoal text-sm text-text-tertiary">
                Нет доступных услуг для выбранного специалиста
              </div>
            ) : (
              <select
                value={serviceId}
                onChange={(e) => { setServiceId(e.target.value); setPriceOverride(''); }}
                disabled={saving}
                className={selectCls}
              >
                <option value="">{specialistId ? 'Выберите услугу' : 'Сначала выберите продавца'}</option>
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.basePrice.toLocaleString('ru-RU')} ₽ / {s.baseDuration} мин
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Количество</label>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={quantity}
                onChange={(e) => {
                  const q = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                  setQuantity(q);
                  setPriceOverride('');
                }}
                disabled={saving}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Сумма (₽){selectedService && quantity > 1
                  ? ` · ${selectedService.basePrice.toLocaleString('ru-RU')} × ${quantity}`
                  : ''}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceOverride !== '' ? priceOverride : (selectedService ? String(selectedService.basePrice * quantity) : '')}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder="Сумма"
                disabled={saving}
                className={inputCls}
              />
            </div>
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Дата и время *</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={saving}
              className={inputCls}
            />
          </div>

          {/* Auto-resolved location — read-only info */}
          {defaultLocationName && (
            <div className="px-3 py-2 rounded-xl border border-border-luxury bg-charcoal/30 text-xs text-text-tertiary">
              Локация: <span className="text-text-secondary">{defaultLocationName}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Примечание</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Дополнительная информация..."
              disabled={saving}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
              {conflictSlots.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-amber-400">Ближайшие свободные слоты:</p>
                  <div className="flex flex-wrap gap-2">
                    {conflictSlots.map((slot) => {
                      const d = new Date(slot);
                      const label = d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={saving}
                          onClick={() => applyConflictSlot(slot)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-colors"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowOverlap}
                      onChange={(e) => setAllowOverlap(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-champagne"
                    />
                    <span className="text-xs text-text-tertiary">Принудительная запись (только для администраторов)</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50"
            >
              {saving ? 'Запись...' : 'Записать продажу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
