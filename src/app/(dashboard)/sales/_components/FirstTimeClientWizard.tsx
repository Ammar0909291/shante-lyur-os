'use client';

import * as React from 'react';
import { X, ChevronRight, ChevronLeft, Check, Plus, Trash2, Percent } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Specialist {
  id: string; userId: string; name: string; department: string; specialization: string | null;
  commissionRate?: number;
}

interface CommissionAlloc {
  specialistId: string; userId: string; name: string; roleBadge: string;
  percentage: number; amount: number;
}

function floorKopek(pct: number, total: number): number {
  return Math.floor((pct / 100) * total * 100) / 100;
}
interface Service {
  id: string; name: string; basePrice: number; baseDuration: number; category: string;
}
interface Manager { id: string; name: string; role: string; }
interface ServiceLine { serviceId: string; performedBySpecialistId: string; quantity: number; unitPrice: number; }

export interface WizardResult {
  newClient: {
    firstName: string; lastName: string; phone: string;
    whatsapp?: string; telegramHandle?: string; dateOfBirth?: string;
    languagePreference: 'ru' | 'en'; referredBy?: string;
    sourceChannel: 'WALK_IN' | 'SOCIAL_MEDIA' | 'REFERRAL' | 'ONLINE_BOOKING' | 'OTHER';
  };
  tradeManagerId: string;
  employees: { userId: string; role: 'SPECIALIST' | 'MANAGER' | 'OTHER' }[];
  services: ServiceLine[];
  startAt: string;
  payment: { amountCash: number; amountCard: number; amountLoan: number; amountPackage: number; };
  comments: string;
  internalNote: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  specialists: Specialist[];
  services: Service[];
  managers: Manager[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all';
const selectCls = inputCls;
const labelCls = 'block text-xs font-medium text-text-secondary mb-1.5';

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'WALK_IN',        label: 'Walk-in (проходящий)' },
  { value: 'SOCIAL_MEDIA',   label: 'Соцсети' },
  { value: 'REFERRAL',       label: 'Рекомендация' },
  { value: 'ONLINE_BOOKING', label: 'Онлайн-запись' },
  { value: 'OTHER',          label: 'Другое' },
];

const STEPS = ['Клиент', 'Менеджер', 'Специалисты', 'Услуги', 'Оплата', 'Комментарии', 'Комиссия'];

// ── Wizard Component ─────────────────────────────────────────────────────────

export function FirstTimeClientWizard({ onClose, onSaved, specialists, services, managers }: Props) {
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  // Step 1 — Client
  const [firstName, setFirstName]         = React.useState('');
  const [lastName, setLastName]           = React.useState('');
  const [phone, setPhone]                 = React.useState('');
  const [whatsapp, setWhatsapp]           = React.useState('');
  const [telegram, setTelegram]           = React.useState('');
  const [dob, setDob]                     = React.useState('');
  const [langPref, setLangPref]           = React.useState<'ru' | 'en'>('ru');
  const [referredBy, setReferredBy]       = React.useState('');
  const [sourceChannel, setSourceChannel] = React.useState<'WALK_IN' | 'SOCIAL_MEDIA' | 'REFERRAL' | 'ONLINE_BOOKING' | 'OTHER'>('WALK_IN');

  // Step 2 — Manager
  const [managerId, setManagerId] = React.useState('');

  // Step 3 — Specialists
  const [selectedSpecialists, setSelectedSpecialists] = React.useState<string[]>([]);

  // Step 4 — Services
  const [lines, setLines] = React.useState<ServiceLine[]>([
    { serviceId: '', performedBySpecialistId: selectedSpecialists[0] ?? '', quantity: 1, unitPrice: 0 },
  ]);
  const [startAt, setStartAt] = React.useState(() => {
    const d = new Date(); d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });

  // Step 5 — Payment
  const [amountCash,    setAmountCash]    = React.useState(0);
  const [amountCard,    setAmountCard]    = React.useState(0);
  const [amountLoan,    setAmountLoan]    = React.useState(0);
  const [amountPackage, setAmountPackage] = React.useState(0);

  // Step 6 — Comments
  const [comments, setComments]         = React.useState('');
  const [internalNote, setInternalNote] = React.useState('');

  // Step 7 — Commission allocation (derived from selected specialists)
  const [commissionAllocs, setCommissionAllocs] = React.useState<CommissionAlloc[]>([]);

  const saleTotal    = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const paymentTotal = amountCash + amountCard + amountLoan + amountPackage;
  const paymentDiff  = Math.round((paymentTotal - saleTotal) * 100) / 100;

  // Rebuild allocs when specialists or saleTotal changes (triggered on entering step 6)
  React.useEffect(() => {
    setCommissionAllocs(
      selectedSpecialists.map((uid) => {
        const sp = specialists.find((s) => s.userId === uid);
        const pct = Math.round((sp?.commissionRate ?? 0.30) * 100);
        return {
          specialistId: sp?.id ?? uid,
          userId: uid,
          name: sp?.name ?? uid,
          roleBadge: sp?.specialization ?? 'Специалист',
          percentage: pct,
          amount: floorKopek(pct, saleTotal),
        };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecialists, saleTotal]);

  function updateAllocPct(idx: number, raw: string) {
    const pct = Math.min(100, Math.max(0, parseFloat(raw) || 0));
    setCommissionAllocs((prev) =>
      prev.map((a, i) => i === idx ? { ...a, percentage: pct, amount: floorKopek(pct, saleTotal) } : a)
    );
  }

  const allocTotalPct = commissionAllocs.reduce((s, a) => s + a.percentage, 0);
  const allocTotalAmt = commissionAllocs.reduce((s, a) => s + a.amount, 0);

  function validateStep(): string {
    switch (step) {
      case 0:
        if (!firstName.trim()) return 'Введите имя';
        if (!lastName.trim())  return 'Введите фамилию';
        if (phone.trim().length < 5) return 'Введите корректный телефон';
        return '';
      case 1:
        if (!managerId) return 'Выберите трейд-менеджера';
        return '';
      case 2:
        if (selectedSpecialists.length === 0) return 'Выберите хотя бы одного специалиста';
        return '';
      case 3:
        if (lines.some((l) => !l.serviceId)) return 'Заполните все строки услуг';
        if (lines.length === 0) return 'Добавьте хотя бы одну услугу';
        return '';
      case 4:
        if (Math.abs(paymentDiff) > 0.01) return `Сумма платежей не совпадает с итогом (разница ${fmt(paymentDiff)} ₽)`;
        return '';
      default:
        return '';
    }
  }

  function next() {
    const msg = validateStep();
    if (msg) { setError(msg); return; }
    setError('');
    setStep((s) => s + 1);
  }
  function back() { setError(''); setStep((s) => s - 1); }

  function toggleSpecialist(userId: string) {
    setSelectedSpecialists((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function updateLine(i: number, patch: Partial<ServiceLine>) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  function addLine() {
    setLines((prev) => [...prev, {
      serviceId: '', performedBySpecialistId: selectedSpecialists[0] ?? '',
      quantity: 1, unitPrice: 0,
    }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onServiceSelect(i: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    updateLine(i, { serviceId, unitPrice: svc?.basePrice ?? 0 });
  }

  async function handleSave() {
    const msg = validateStep();
    if (msg) { setError(msg); return; }
    setSaving(true); setError('');

    const specUser = specialists.find((s) => s.userId === selectedSpecialists[0]);
    const employees = [
      ...selectedSpecialists.map((uid) => ({ userId: uid, role: 'SPECIALIST' as const })),
      ...(managerId && !selectedSpecialists.includes(managerId) ? [{ userId: managerId, role: 'MANAGER' as const }] : []),
    ];

    void specUser;

    const body: Record<string, unknown> = {
      newClient: {
        firstName, lastName, phone,
        ...(whatsapp && { whatsapp }),
        ...(telegram && { telegramHandle: telegram }),
        ...(dob && { dateOfBirth: dob }),
        languagePreference: langPref,
        ...(referredBy && { referredBy }),
        sourceChannel,
      },
      tradeManagerId: managerId,
      employees,
      services: lines.map((l) => ({
        ...l,
        performedBySpecialistId: l.performedBySpecialistId || undefined,
      })),
      startAt:  new Date(startAt).toISOString(),
      payment:  { amountCash, amountCard, amountLoan, amountPackage },
      comments,
      internalNote,
    };

    try {
      const res  = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const json = await res.json() as { success: boolean; data?: { appointmentId?: string }; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? 'Ошибка сохранения'); return; }
      onSaved();
    } catch { setError('Ошибка соединения'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-obsidian border border-border-luxury rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <div>
            <h2 className="font-serif text-xl font-medium text-text-primary">Новый клиент — продажа</h2>
            <p className="text-xs text-text-tertiary mt-0.5">Шаг {step + 1} из {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-border-luxury shrink-0">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-champagne' : 'bg-charcoal'}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* STEP 0 — Client */}
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Имя *</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="Имя" />
                </div>
                <div>
                  <label className={labelCls}>Фамилия *</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Фамилия" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Телефон *</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+7 999 000-00-00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="+7..." />
                </div>
                <div>
                  <label className={labelCls}>Telegram</label>
                  <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className={inputCls} placeholder="@username" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Дата рождения</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Язык</label>
                  <select value={langPref} onChange={(e) => setLangPref(e.target.value as 'ru' | 'en')} className={selectCls}>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Источник</label>
                <select value={sourceChannel} onChange={(e) => setSourceChannel(e.target.value as typeof sourceChannel)} className={selectCls}>
                  {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Кто порекомендовал</label>
                <input value={referredBy} onChange={(e) => setReferredBy(e.target.value)} className={inputCls} placeholder="Имя или ссылка на клиента" />
              </div>
            </>
          )}

          {/* STEP 1 — Manager */}
          {step === 1 && (
            <>
              <p className="text-sm text-text-secondary">Выберите трейд-менеджера — сотрудника, который занимался привлечением и оформлением.</p>
              <div className="space-y-2">
                {managers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setManagerId(m.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                      managerId === m.id
                        ? 'border-champagne/60 bg-champagne/10 text-champagne'
                        : 'border-border-luxury bg-charcoal/20 text-text-primary hover:bg-charcoal/40'
                    }`}
                  >
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-text-tertiary">{m.role}</span>
                  </button>
                ))}
                {managers.length === 0 && (
                  <p className="text-sm text-text-tertiary text-center py-6">Менеджеры не найдены</p>
                )}
              </div>
            </>
          )}

          {/* STEP 2 — Specialists */}
          {step === 2 && (
            <>
              <p className="text-sm text-text-secondary">Выберите специалистов (можно несколько).</p>
              <div className="space-y-2">
                {specialists.map((s) => {
                  const selected = selectedSpecialists.includes(s.userId);
                  return (
                    <button
                      key={s.userId}
                      type="button"
                      onClick={() => toggleSpecialist(s.userId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                        selected ? 'border-champagne/60 bg-champagne/10' : 'border-border-luxury bg-charcoal/20 hover:bg-charcoal/40'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'border-champagne bg-champagne' : 'border-text-tertiary'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-obsidian" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${selected ? 'text-champagne' : 'text-text-primary'}`}>{s.name}</p>
                        <p className="text-xs text-text-tertiary">{s.department}{s.specialization ? ` · ${s.specialization}` : ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* STEP 3 — Services */}
          {step === 3 && (
            <>
              <div>
                <label className={labelCls}>Дата и время</label>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-3">
                {lines.map((line, i) => (
                  <div key={i} className="rounded-xl border border-border-luxury p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Услуга {i + 1}</span>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)} className="p-1 text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <select
                      value={line.serviceId}
                      onChange={(e) => onServiceSelect(i, e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Выберите услугу</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} — {s.basePrice.toLocaleString('ru-RU')} ₽</option>
                      ))}
                    </select>
                    {selectedSpecialists.length > 1 && (
                      <select
                        value={line.performedBySpecialistId}
                        onChange={(e) => updateLine(i, { performedBySpecialistId: e.target.value })}
                        className={selectCls}
                      >
                        <option value="">Специалист (не указан)</option>
                        {selectedSpecialists.map((uid) => {
                          const sp = specialists.find((s) => s.userId === uid);
                          return sp ? <option key={uid} value={sp.id}>{sp.name}</option> : null;
                        })}
                      </select>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Кол-во</label>
                        <input
                          type="number" min="1" max="50" value={line.quantity}
                          onChange={(e) => updateLine(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Цена (₽)</label>
                        <input
                          type="number" min="0" step="0.01" value={line.unitPrice}
                          onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="text-right text-xs text-text-tertiary">
                      Итого: <span className="text-champagne font-medium">{fmt(line.unitPrice * line.quantity)} ₽</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLine}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-champagne/30 text-champagne/70 text-sm hover:bg-champagne/5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Добавить услугу
              </button>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-champagne/5 border border-champagne/10">
                <span className="text-sm text-text-secondary">Итого по заказу</span>
                <span className="text-lg font-semibold text-champagne">{fmt(saleTotal)} ₽</span>
              </div>
            </>
          )}

          {/* STEP 4 — Payment */}
          {step === 4 && (
            <>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-champagne/5 border border-champagne/10 mb-2">
                <span className="text-sm text-text-secondary">Сумма к оплате</span>
                <span className="text-lg font-semibold text-champagne">{fmt(saleTotal)} ₽</span>
              </div>
              {[
                { label: 'Наличные', value: amountCash,    set: setAmountCash    },
                { label: 'Карта',    value: amountCard,    set: setAmountCard    },
                { label: 'Рассрочка', value: amountLoan,  set: setAmountLoan    },
                { label: 'Пакет/баланс', value: amountPackage, set: setAmountPackage },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className={labelCls}>{label} (₽)</label>
                  <input
                    type="number" min="0" step="0.01" value={value}
                    onChange={(e) => set(parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
              ))}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                Math.abs(paymentDiff) < 0.01
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-red-500/30 bg-red-500/5'
              }`}>
                <span className="text-sm text-text-secondary">
                  {Math.abs(paymentDiff) < 0.01 ? '✓ Оплата сходится' : `Разница: ${fmt(paymentDiff)} ₽`}
                </span>
                <span className={`text-sm font-semibold ${Math.abs(paymentDiff) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(paymentTotal)} / {fmt(saleTotal)} ₽
                </span>
              </div>
            </>
          )}

          {/* STEP 5 — Comments */}
          {step === 5 && (
            <>
              <div>
                <label className={labelCls}>Комментарий (виден всем)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  placeholder="Пожелания, особенности процедуры..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Внутренняя заметка (только для администраторов)</label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={3}
                  placeholder="Не видна клиенту..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </>
          )}

          {/* STEP 6 — Commission allocation */}
          {step === 6 && (
            <>
              {commissionAllocs.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-8">Специалисты не выбраны — комиссия не распределяется</p>
              ) : (
                <div className="rounded-xl border border-border-luxury bg-charcoal/40 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border-luxury/60">
                    <Percent className="w-3.5 h-3.5 text-champagne shrink-0" />
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Распределение комиссии</span>
                    <span className="ml-auto text-xs text-text-tertiary tabular-nums">
                      Сумма: <span className="text-text-secondary">{fmt(saleTotal)} ₽</span>
                    </span>
                  </div>
                  {saleTotal === 0 && (
                    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-400">
                      Сумма продажи ₽0 — комиссия будет ₽0
                    </div>
                  )}
                  <div className="divide-y divide-border-luxury/40">
                    {commissionAllocs.map((alloc, idx) => (
                      <div key={alloc.specialistId} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-champagne/10 border border-champagne/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-champagne">{alloc.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{alloc.name}</p>
                          <p className="text-xs text-text-tertiary">{alloc.roleBadge}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={alloc.percentage}
                              onChange={(e) => updateAllocPct(idx, e.target.value)}
                              className="w-20 px-2 py-1.5 pr-6 rounded-lg bg-onyx border border-border-luxury text-text-primary text-sm text-right focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all tabular-nums"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary pointer-events-none">%</span>
                          </div>
                          <span className="text-xs text-text-tertiary">=</span>
                          <span className="text-sm font-medium text-champagne tabular-nums w-24 text-right">{fmt(alloc.amount)} ₽</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`flex items-center justify-between px-4 py-2.5 border-t text-xs tabular-nums ${
                    allocTotalPct > 100
                      ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
                      : allocTotalPct === 100
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                        : 'border-border-luxury/60 text-text-muted'
                  }`}>
                    <span>
                      {allocTotalPct > 100 && '⚠ '}
                      {allocTotalPct === 100 && '✓ '}
                      Итого: <span className="font-medium">{allocTotalPct.toFixed(1)}%</span>
                    </span>
                    <span className="font-medium">{fmt(allocTotalAmt)} ₽</span>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border-luxury shrink-0">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Назад
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors"
            >
              Далее <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить продажу'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
