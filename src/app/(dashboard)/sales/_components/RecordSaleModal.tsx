'use client';

import * as React from 'react';
import { X, Search, Plus, Trash2, UserPlus } from 'lucide-react';
import { FirstTimeClientWizard } from './FirstTimeClientWizard';

// ── Types ────────────────────────────────────────────────────────────────────

interface Specialist {
  id: string; userId: string; name: string; department: string; specialization: string | null;
}
interface Service { id: string; name: string; basePrice: number; baseDuration: number; category: string; }
interface Manager { id: string; name: string; role: string; }
interface ClientResult {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  clientType: string; lastVisitAt: string | null;
}
interface ServiceLine { serviceId: string; performedBySpecialistId: string; quantity: number; unitPrice: number; }

export interface RecordSaleModalProps {
  onClose: () => void;
  onSaved: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

const inputCls  = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all';
const selectCls = inputCls;
const labelCls  = 'block text-xs font-medium text-text-secondary mb-1.5';

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

const CLIENT_TYPE_BADGE: Record<string, string> = {
  NEW:          'text-green-400 bg-green-400/10',
  RETURNING:    'text-blue-400 bg-blue-400/10',
  SUBSCRIPTION: 'text-champagne bg-champagne/10',
};
const CLIENT_TYPE_LABEL: Record<string, string> = {
  NEW: 'Новый', RETURNING: 'Постоянный', SUBSCRIPTION: 'Абонемент',
};

// ── Component ────────────────────────────────────────────────────────────────

export function RecordSaleModal({ onClose, onSaved }: RecordSaleModalProps) {
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [services,    setServices]    = React.useState<Service[]>([]);
  const [managers,    setManagers]    = React.useState<Manager[]>([]);
  const [locationId,  setLocationId]  = React.useState('');

  // Client autocomplete
  const [clientQuery,   setClientQuery]   = React.useState('');
  const [clientResults, setClientResults] = React.useState<ClientResult[]>([]);
  const [clientDropdown, setClientDropdown] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientResult | null>(null);

  // Wizard
  const [showWizard, setShowWizard] = React.useState(false);

  // Sale form
  const [managerId, setManagerId] = React.useState('');
  const [selectedSpecialists, setSelectedSpecialists] = React.useState<string[]>([]);
  const [otherEmployees, setOtherEmployees] = React.useState<string[]>([]);
  const [lines, setLines] = React.useState<ServiceLine[]>([
    { serviceId: '', performedBySpecialistId: '', quantity: 1, unitPrice: 0 },
  ]);
  const [startAt, setStartAt] = React.useState(() => {
    const d = new Date(); d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [amountCash,    setAmountCash]    = React.useState(0);
  const [amountCard,    setAmountCard]    = React.useState(0);
  const [amountLoan,    setAmountLoan]    = React.useState(0);
  const [amountPackage, setAmountPackage] = React.useState(0);
  const [comments,     setComments]      = React.useState('');
  const [internalNote, setInternalNote]  = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState('');

  const debouncedQuery = useDebounce(clientQuery, 300);

  // Load reference data
  React.useEffect(() => {
    Promise.all([
      fetch('/api/specialists?limit=100&status=ACTIVE', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/services', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/locations', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/users?limit=100', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([sp, sv, loc, usr]) => {
      if (sp.success) {
        setSpecialists(
          (sp.data?.items ?? sp.data ?? []).map((s: {
            id: string; userId: string; firstName: string; lastName: string;
            specialization?: string | null; department?: string;
          }) => ({
            id: s.id, userId: s.userId,
            name: `${s.firstName} ${s.lastName}`.trim(),
            department: s.department ?? 'COSMETOLOGY',
            specialization: s.specialization ?? null,
          })),
        );
      }
      if (sv.success) {
        setServices(
          (sv.data?.items ?? sv.data ?? [])
            .filter((s: { isActive?: boolean }) => s.isActive !== false)
            .map((s: { id: string; name: string; basePrice: number; baseDuration: number; category: string }) => s),
        );
      }
      if (loc.success) {
        const locs = loc.data?.items ?? loc.data ?? [];
        if (locs.length > 0) setLocationId(locs[0].id as string);
      }
      if (usr.success) {
        setManagers(
          (usr.data?.items ?? []).map((u: { id: string; firstName: string; lastName: string; role: string }) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            role: u.role,
          })),
        );
      }
    }).catch(() => {});
  }, []);

  // Client search
  React.useEffect(() => {
    if (debouncedQuery.trim().length < 2) { setClientResults([]); return; }
    fetch(`/api/clients/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { items: ClientResult[] } }) => {
        if (json.success) setClientResults(json.data?.items ?? []);
      })
      .catch(() => {});
  }, [debouncedQuery]);

  function selectClient(c: ClientResult) {
    setSelectedClient(c);
    setClientQuery(`${c.firstName} ${c.lastName}`);
    setClientDropdown(false);
    setClientResults([]);
  }

  function clearClient() {
    setSelectedClient(null);
    setClientQuery('');
    setClientResults([]);
  }

  function toggleSpecialist(userId: string) {
    setSelectedSpecialists((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function toggleOther(id: string) {
    setOtherEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function updateLine(i: number, patch: Partial<ServiceLine>) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  function onServiceSelect(i: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    updateLine(i, { serviceId, unitPrice: svc?.basePrice ?? 0 });
  }

  function addLine() {
    setLines((prev) => [...prev, { serviceId: '', performedBySpecialistId: selectedSpecialists[0] ?? '', quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const saleTotal    = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const paymentTotal = amountCash + amountCard + amountLoan + amountPackage;
  const paymentDiff  = Math.round((paymentTotal - saleTotal) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedClient)             { setError('Выберите клиента'); return; }
    if (!managerId)                  { setError('Выберите менеджера'); return; }
    if (selectedSpecialists.length === 0) { setError('Выберите хотя бы одного специалиста'); return; }
    if (lines.some((l) => !l.serviceId)) { setError('Заполните все строки услуг'); return; }
    if (Math.abs(paymentDiff) > 0.01) {
      setError(`Сумма платежей не совпадает с итогом (разница ${fmt(paymentDiff)} ₽)`); return;
    }

    const employees = [
      ...selectedSpecialists.map((uid) => ({ userId: uid, role: 'SPECIALIST' as const })),
      ...(managerId && !selectedSpecialists.includes(managerId) ? [{ userId: managerId, role: 'MANAGER' as const }] : []),
      ...otherEmployees
        .filter((id) => !selectedSpecialists.includes(id) && id !== managerId)
        .map((uid) => ({ userId: uid, role: 'OTHER' as const })),
    ];

    setSaving(true);
    try {
      const res  = await fetch('/api/sales', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          existingClientId: selectedClient.id,
          tradeManagerId:   managerId,
          employees,
          services: lines,
          startAt:  new Date(startAt).toISOString(),
          locationId: locationId || undefined,
          payment: { amountCash, amountCard, amountLoan, amountPackage },
          comments,
          internalNote,
        }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? 'Ошибка сохранения'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); }
    finally  { setSaving(false); }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-2xl bg-obsidian border border-border-luxury rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
            <h3 className="font-serif text-lg font-medium text-text-primary">Записать продажу</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* ── Client autocomplete ── */}
            <div className="relative">
              <label className={labelCls}>Клиент *</label>
              {selectedClient ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-champagne/30 bg-champagne/5">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{selectedClient.firstName} {selectedClient.lastName}</p>
                    <p className="text-xs text-text-tertiary">{selectedClient.phone ?? selectedClient.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CLIENT_TYPE_BADGE[selectedClient.clientType] ?? CLIENT_TYPE_BADGE.RETURNING}`}>
                      {CLIENT_TYPE_LABEL[selectedClient.clientType] ?? selectedClient.clientType}
                    </span>
                    <button type="button" onClick={clearClient} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                    <input
                      value={clientQuery}
                      onChange={(e) => { setClientQuery(e.target.value); setClientDropdown(true); }}
                      onFocus={() => setClientDropdown(true)}
                      onBlur={() => setTimeout(() => setClientDropdown(false), 150)}
                      placeholder="Поиск по имени, телефону..."
                      disabled={saving}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  {clientDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian border border-border-luxury rounded-xl shadow-xl z-20 overflow-hidden">
                      {/* First-time client option */}
                      <button
                        type="button"
                        onMouseDown={() => { setClientDropdown(false); setShowWizard(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-champagne/10 transition-colors border-b border-border-luxury"
                      >
                        <UserPlus className="w-4 h-4 text-champagne shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-champagne">Первый визит клиента</p>
                          <p className="text-xs text-text-tertiary">Создать нового клиента и оформить продажу</p>
                        </div>
                      </button>
                      {clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => selectClient(c)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-charcoal transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-sm font-medium text-text-primary">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-text-tertiary">{c.phone ?? c.email}{c.lastVisitAt ? ` · ${new Date(c.lastVisitAt).toLocaleDateString('ru-RU')}` : ''}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 ${CLIENT_TYPE_BADGE[c.clientType] ?? CLIENT_TYPE_BADGE.RETURNING}`}>
                            {CLIENT_TYPE_LABEL[c.clientType] ?? c.clientType}
                          </span>
                        </button>
                      ))}
                      {clientResults.length === 0 && clientQuery.length >= 2 && (
                        <p className="text-sm text-text-tertiary px-4 py-3">Клиент не найден</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Trade manager ── */}
            <div>
              <label className={labelCls}>Трейд-менеджер *</label>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} disabled={saving} className={selectCls}>
                <option value="">Выберите менеджера</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                ))}
              </select>
            </div>

            {/* ── Specialists ── */}
            <div>
              <label className={labelCls}>Специалисты *</label>
              <div className="flex flex-wrap gap-2">
                {specialists.map((s) => {
                  const selected = selectedSpecialists.includes(s.userId);
                  return (
                    <button
                      key={s.userId}
                      type="button"
                      onClick={() => toggleSpecialist(s.userId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-champagne/60 bg-champagne/15 text-champagne'
                          : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal'
                      }`}
                    >
                      {s.name}
                      {s.specialization ? ` (${s.specialization})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Service lines ── */}
            <div className="space-y-3">
              <label className={labelCls}>Услуги *</label>
              {lines.map((line, i) => (
                <div key={i} className="rounded-xl border border-border-luxury p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={line.serviceId}
                      onChange={(e) => onServiceSelect(i, e.target.value)}
                      disabled={saving}
                      className={`${selectCls} flex-1`}
                    >
                      <option value="">Выберите услугу</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} — {s.basePrice.toLocaleString('ru-RU')} ₽</option>
                      ))}
                    </select>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="p-1.5 text-red-400 hover:text-red-300 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {selectedSpecialists.length > 1 && (
                    <select
                      value={line.performedBySpecialistId}
                      onChange={(e) => updateLine(i, { performedBySpecialistId: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">Специалист не выбран</option>
                      {selectedSpecialists.map((uid) => {
                        const sp = specialists.find((s) => s.userId === uid);
                        return sp ? <option key={uid} value={sp.id}>{sp.name}</option> : null;
                      })}
                    </select>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-text-tertiary mb-1">Кол-во</p>
                      <input
                        type="number" min="1" max="50" value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        disabled={saving}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary mb-1">Цена (₽)</p>
                      <input
                        type="number" min="0" step="0.01" value={line.unitPrice}
                        onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                        disabled={saving}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary mb-1">Итого</p>
                      <div className={`${inputCls} text-champagne font-medium cursor-default`}>
                        {fmt(line.unitPrice * line.quantity)} ₽
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs text-champagne/70 hover:text-champagne transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить услугу
              </button>
            </div>

            {/* ── Date/time ── */}
            <div>
              <label className={labelCls}>Дата и время *</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} disabled={saving} className={inputCls} />
            </div>

            {/* ── Payment split ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={`${labelCls} mb-0`}>Оплата</label>
                <span className="text-xs text-text-tertiary">Итого: <span className="text-champagne font-medium">{fmt(saleTotal)} ₽</span></span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Наличные', value: amountCash,    set: setAmountCash    },
                  { label: 'Карта',    value: amountCard,    set: setAmountCard    },
                  { label: 'Рассрочка', value: amountLoan,  set: setAmountLoan    },
                  { label: 'Пакет',    value: amountPackage, set: setAmountPackage },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <p className="text-[10px] text-text-tertiary mb-1">{label} (₽)</p>
                    <input
                      type="number" min="0" step="0.01" value={value}
                      onChange={(e) => set(parseFloat(e.target.value) || 0)}
                      disabled={saving}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                Math.abs(paymentDiff) < 0.01
                  ? 'border-green-500/20 bg-green-500/5 text-green-400'
                  : 'border-red-500/20 bg-red-500/5 text-red-400'
              }`}>
                {Math.abs(paymentDiff) < 0.01
                  ? `✓ ${fmt(paymentTotal)} ₽ — оплата сходится`
                  : `Разница: ${fmt(paymentDiff)} ₽ (внесено ${fmt(paymentTotal)} из ${fmt(saleTotal)} ₽)`}
              </div>
            </div>

            {/* ── Other employees ── */}
            {managers.length > 0 && (
              <div>
                <label className={labelCls}>Другие участники (необязательно)</label>
                <div className="flex flex-wrap gap-2">
                  {managers
                    .filter((m) => !selectedSpecialists.includes(m.id) && m.id !== managerId)
                    .map((m) => {
                      const sel = otherEmployees.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleOther(m.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                            sel ? 'border-champagne/40 bg-champagne/10 text-champagne' : 'border-border-luxury text-text-tertiary hover:text-text-primary'
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ── Comments ── */}
            <div>
              <label className={labelCls}>Комментарий</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                placeholder="Пожелания, особенности..."
                disabled={saving}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className={labelCls}>Внутренняя заметка</label>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                placeholder="Не видна клиенту..."
                disabled={saving}
                className={`${inputCls} resize-none`}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
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
                {saving ? 'Сохранение...' : 'Записать продажу'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showWizard && (
        <FirstTimeClientWizard
          onClose={() => setShowWizard(false)}
          onSaved={() => { setShowWizard(false); onSaved(); }}
          specialists={specialists}
          services={services}
          managers={managers}
        />
      )}
    </>
  );
}
