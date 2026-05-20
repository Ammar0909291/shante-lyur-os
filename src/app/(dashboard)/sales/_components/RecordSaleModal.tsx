'use client';

import * as React from 'react';
import { X, Search } from 'lucide-react';

interface Specialist { id: string; userId: string; name: string; specialization: string | null; }
interface Service { id: string; name: string; basePrice: number; baseDuration: number; category: string; }
interface Location { id: string; name: string; }
interface StaffUser { id: string; name: string; role: string; }
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

export function RecordSaleModal({ onClose, onSaved }: RecordSaleModalProps) {
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [staffUsers, setStaffUsers] = React.useState<StaffUser[]>([]);

  const [clientQuery, setClientQuery] = React.useState('');
  const [clientResults, setClientResults] = React.useState<ClientResult[]>([]);
  const [clientDropdown, setClientDropdown] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientResult | null>(null);

  const [specialistId, setSpecialistId] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [soldByUserId, setSoldByUserId] = React.useState('');
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

  const debouncedQuery = useDebounce(clientQuery, 250);

  // Load reference data on mount
  React.useEffect(() => {
    Promise.all([
      fetch('/api/specialists?limit=100').then((r) => r.json()),
      fetch('/api/admin/services').then((r) => r.json()),
      fetch('/api/locations').then((r) => r.json()),
      fetch('/api/admin/users?limit=100').then((r) => r.json()),
    ]).then(([sp, sv, loc, staff]) => {
      if (sp.success) {
        setSpecialists((sp.data?.items ?? sp.data ?? []).map((s: { id: string; userId: string; firstName: string; lastName: string; specialization?: string | null }) => ({
          id: s.id,
          userId: s.userId,
          name: `${s.firstName} ${s.lastName}`.trim(),
          specialization: s.specialization ?? null,
        })));
      }
      if (sv.success) {
        setServices((sv.data?.items ?? sv.data ?? []).map((s: { id: string; name: string; basePrice: number; baseDuration: number; category: string }) => ({
          id: s.id, name: s.name, basePrice: s.basePrice, baseDuration: s.baseDuration, category: s.category,
        })));
      }
      if (loc.success) {
        setLocations((loc.data?.items ?? loc.data ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
      }
      if (staff.success) {
        setStaffUsers((staff.data?.items ?? staff.data ?? []).map((u: { id: string; name?: string; firstName?: string; lastName?: string; role: string }) => ({
          id: u.id, name: u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(), role: u.role,
        })));
      }
    }).catch(() => {/* ignore fetch errors */});
  }, []);

  // Client search
  React.useEffect(() => {
    if (!debouncedQuery.trim()) { setClientResults([]); return; }
    fetch(`/api/clients/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClientResults(json.data?.items ?? []);
      })
      .catch(() => {/* ignore */});
  }, [debouncedQuery]);

  const selectedService = services.find((s) => s.id === serviceId);
  const autoPrice = selectedService ? selectedService.basePrice * quantity : 0;

  function getSpecialistCategories(specialization: string): string[] {
    const s = specialization.toLowerCase();
    const cats: string[] = [];
    if (s.includes('массаж') || s.includes('spa') || s.includes('спа')) cats.push('MASSAGE');
    if (s.includes('косметолог') || s.includes('уходов') || s.includes('лицо') || s.includes('фейс')) cats.push('COSMETOLOGY', 'FACIAL');
    if (s.includes('инъекц')) cats.push('INJECTION');
    if (s.includes('лазер')) cats.push('LASER', 'HAIR_REMOVAL');
    if (s.includes('эпиляц')) cats.push('HAIR_REMOVAL');
    return Array.from(new Set(cats));
  }

  const selectedSpecialistObj = specialists.find((s) => s.id === specialistId);
  const filteredServices = React.useMemo(() => {
    if (!selectedSpecialistObj?.specialization) return services;
    const cats = getSpecialistCategories(selectedSpecialistObj.specialization);
    if (cats.length === 0) return services;
    return services.filter((s) => cats.includes(s.category));
  }, [selectedSpecialistObj, services]);
  const effectivePrice = priceOverride !== '' ? parseFloat(priceOverride) : autoPrice;

  function selectClient(c: ClientResult) {
    setSelectedClient(c);
    setClientQuery(`${c.firstName} ${c.lastName}`);
    setClientDropdown(false);
    setClientResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedClient) { setError('Выберите клиента'); return; }
    if (!specialistId) { setError('Выберите специалиста'); return; }
    if (!serviceId) { setError('Выберите услугу'); return; }
    if (!locationId) { setError('Выберите локацию'); return; }
    if (!startAt) { setError('Укажите дату и время'); return; }
    if (isNaN(effectivePrice) || effectivePrice < 0) { setError('Некорректная цена'); return; }

    setSaving(true);
    try {
      const service = services.find((s) => s.id === serviceId)!;
      // Distribute total price evenly across quantity
      const pricePerUnit = Math.round((effectivePrice / quantity) * 100) / 100;
      const serviceEntries = Array.from({ length: quantity }, (_, i) => ({
        serviceId,
        price: pricePerUnit,
        duration: service.baseDuration,
        sortOrder: i,
      }));
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          specialistId,
          locationId,
          startAt: new Date(startAt).toISOString(),
          services: serviceEntries,
          notes: notes.trim() || undefined,
          source: 'admin',
          soldByUserId: soldByUserId || undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-obsidian border border-border-luxury rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <h3 className="font-serif text-lg font-medium text-text-primary">Записать продажу</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
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
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setSelectedClient(null);
                  setClientDropdown(true);
                }}
                onFocus={() => setClientDropdown(true)}
                onBlur={() => setTimeout(() => setClientDropdown(false), 150)}
                placeholder="Поиск по имени или email..."
                disabled={saving}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
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

          {/* Specialist */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Специалист *</label>
            <select
              value={specialistId}
              onChange={(e) => { setSpecialistId(e.target.value); setServiceId(''); setPriceOverride(''); }}
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
            >
              <option value="">Выберите специалиста</option>
              {specialists.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.specialization ? ` — ${s.specialization}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Услуга *</label>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setPriceOverride('');
              }}
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
            >
              <option value="">Выберите услугу</option>
              {filteredServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.basePrice.toLocaleString('ru-RU')} ₽ / {s.baseDuration} мин</option>
              ))}
            </select>
          </div>

          {/* Quantity + Price row */}
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
                className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Итого (₽){selectedService && quantity > 1 ? ` · ${selectedService.basePrice.toLocaleString('ru-RU')} × ${quantity}` : ''}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceOverride !== '' ? priceOverride : (selectedService ? String(selectedService.basePrice * quantity) : '')}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder="Сумма"
                disabled={saving}
                className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Локация *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
            >
              <option value="">Выберите локацию</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Дата и время *</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
            />
          </div>

          {/* Sold by */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Продавец</label>
            <select
              value={soldByUserId}
              onChange={(e) => setSoldByUserId(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all disabled:opacity-50"
            >
              <option value="">— Не указан —</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Примечание</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Дополнительная информация..."
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all resize-none disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
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
