'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Check, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Dept = 'MASSAGE' | 'COSMETOLOGY';

interface Specialist {
  id: string;
  name: string;
  specialization: string | null;
  rating: number | null;
  avatarUrl: string | null;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

type Step = 'dept' | 'specialist' | 'service' | 'date' | 'time' | 'contact' | 'confirm' | 'done';

const STEPS: Step[] = ['dept', 'specialist', 'service', 'date', 'time', 'contact', 'confirm', 'done'];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DOW_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtPrice(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function calendarMatrix(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset   = (firstDay === 0 ? 6 : firstDay - 1); // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const visibleSteps = STEPS.slice(0, -1); // exclude 'done' from indicator
  const idx = visibleSteps.indexOf(current);
  return (
    <div className="flex items-center gap-1 mb-8">
      {visibleSteps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              i < idx
                ? 'bg-champagne text-obsidian'
                : i === idx
                ? 'bg-champagne/20 border border-champagne text-champagne'
                : 'bg-white/5 border border-white/10 text-white/30'
            }`}
          >
            {i < idx ? <Check size={12} /> : i + 1}
          </div>
          {i < visibleSteps.length - 1 && (
            <div className={`flex-1 h-px ${i < idx ? 'bg-champagne/50' : 'bg-white/10'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-xl text-white mb-5">{children}</h2>;
}

function Card({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-champagne bg-champagne/10 text-white'
          : 'border-white/10 bg-white/5 hover:border-champagne/40 hover:bg-white/8 text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

function NextBtn({
  label = 'Далее',
  onClick,
  disabled,
  loading,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full mt-6 py-3 rounded-xl font-semibold text-sm bg-champagne text-obsidian hover:bg-champagne/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {label}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors mb-4"
    >
      <ChevronLeft size={14} />
      Назад
    </button>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function BookPage() {
  const [step, setStep]         = useState<Step>('dept');
  const [dept, setDept]         = useState<Dept | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialist, setSpecialist]   = useState<Specialist | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService]   = useState<Service | null>(null);
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [workDays, setWorkDays] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots]       = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Load specialists when dept chosen
  useEffect(() => {
    if (!dept) return;
    setLoading(true);
    fetch(`/api/public/booking/specialists?dept=${dept}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setSpecialists(j.data.specialists); })
      .finally(() => setLoading(false));
  }, [dept]);

  // Load services when specialist chosen
  useEffect(() => {
    if (!specialist) return;
    setLoading(true);
    fetch(`/api/public/booking/services?specialistId=${specialist.id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setServices(j.data.services); })
      .finally(() => setLoading(false));
  }, [specialist]);

  // Load working days for calendar month
  const loadWorkDays = useCallback(() => {
    if (!specialist) return;
    const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const to   = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    fetch(`/api/public/booking/working-days?specialistId=${specialist.id}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.workDays) {
          setWorkDays(new Set(j.data.workDays as string[]));
        }
      });
  }, [specialist, calYear, calMonth]);

  useEffect(() => {
    if (step === 'date') loadWorkDays();
  }, [step, loadWorkDays]);

  // Load time slots when date selected
  useEffect(() => {
    if (!specialist || !selectedDate || !service) return;
    setSlots([]);
    setSelectedTime(null);
    fetch(`/api/public/booking/slots?specialistId=${specialist.id}&date=${selectedDate}&duration=${service.duration}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setSlots(j.data.slots); });
  }, [specialist, selectedDate, service]);

  function go(s: Step) {
    setError(null);
    setStep(s);
  }

  async function submitBooking() {
    if (!specialist || !service || !selectedDate || !selectedTime || !firstName || !phone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialistId: specialist.id,
          serviceId:    service.id,
          date:         selectedDate,
          time:         selectedTime,
          firstName:    firstName.trim(),
          lastName:     lastName.trim(),
          phone:        phone.trim(),
        }),
      });
      const j = await res.json();
      if (j.success) {
        setBookingId(j.data.appointmentId);
        go('done');
      } else {
        setError(j.error?.message ?? 'Ошибка при создании записи');
      }
    } catch {
      setError('Сетевая ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const matrix   = calendarMatrix(calYear, calMonth);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-10 px-4"
      style={{ background: 'radial-gradient(ellipse at 20% 40%, #0d0a1a 0%, #060410 60%, #020208 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #d4af37, #f5e091, #b8860b)' }}
        >
          <span className="font-serif text-lg font-bold text-obsidian">SL</span>
        </div>
        <div>
          <div className="font-serif text-xl font-semibold text-white">Shante Lyur</div>
          <div className="text-xs tracking-widest uppercase text-white/40">Велнес-студия</div>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-7"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.15)', backdropFilter: 'blur(20px)' }}
      >
        {step !== 'done' && <StepIndicator current={step} />}

        {/* ── Step: dept ─────────────────────────────────────────── */}
        {step === 'dept' && (
          <>
            <SectionTitle>Выберите направление</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Card selected={dept === 'MASSAGE'} onClick={() => { setDept('MASSAGE'); go('specialist'); }}>
                <div className="text-2xl mb-2">💆</div>
                <div className="font-semibold text-sm">Массаж</div>
                <div className="text-xs text-white/50 mt-1">Расслабление и восстановление</div>
              </Card>
              <Card selected={dept === 'COSMETOLOGY'} onClick={() => { setDept('COSMETOLOGY'); go('specialist'); }}>
                <div className="text-2xl mb-2">✨</div>
                <div className="font-semibold text-sm">Косметология</div>
                <div className="text-xs text-white/50 mt-1">Уход и красота</div>
              </Card>
            </div>
          </>
        )}

        {/* ── Step: specialist ───────────────────────────────────── */}
        {step === 'specialist' && (
          <>
            <BackBtn onClick={() => go('dept')} />
            <SectionTitle>Выберите специалиста</SectionTitle>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-champagne" /></div>
            ) : specialists.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-6">Нет доступных специалистов</p>
            ) : (
              <div className="flex flex-col gap-3">
                {specialists.map((s) => (
                  <Card key={s.id} selected={specialist?.id === s.id} onClick={() => { setSpecialist(s); go('service'); }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #d4af37, #b8860b)', color: '#0a0a0f' }}
                      >
                        {s.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{s.name}</div>
                        {s.specialization && <div className="text-xs text-white/50 truncate">{s.specialization}</div>}
                        {s.rating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star size={10} className="text-champagne fill-champagne" />
                            <span className="text-xs text-champagne">{s.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step: service ──────────────────────────────────────── */}
        {step === 'service' && (
          <>
            <BackBtn onClick={() => go('specialist')} />
            <SectionTitle>Выберите процедуру</SectionTitle>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-champagne" /></div>
            ) : services.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-6">Нет доступных процедур</p>
            ) : (
              <div className="flex flex-col gap-3">
                {services.map((svc) => (
                  <Card key={svc.id} selected={service?.id === svc.id} onClick={() => { setService(svc); setSelectedDate(null); setSelectedTime(null); go('date'); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{svc.name}</div>
                        <div className="text-xs text-white/50 mt-0.5">{fmtDuration(svc.duration)}</div>
                      </div>
                      <div className="text-champagne font-semibold text-sm whitespace-nowrap">{fmtPrice(svc.price)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step: date ─────────────────────────────────────────── */}
        {step === 'date' && (
          <>
            <BackBtn onClick={() => go('service')} />
            <SectionTitle>Выберите дату</SectionTitle>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                  else setCalMonth(m => m - 1);
                }}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-white">{MONTHS_RU[calMonth]} {calYear}</span>
              <button
                onClick={() => {
                  if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                  else setCalMonth(m => m + 1);
                }}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {/* DOW headers */}
            <div className="grid grid-cols-7 mb-1">
              {DOW_SHORT.map((d) => (
                <div key={d} className="text-center text-xs text-white/30 py-1 font-medium">{d}</div>
              ))}
            </div>
            {/* Calendar */}
            <div className="flex flex-col gap-1">
              {matrix.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((cell, di) => {
                    if (!cell) return <div key={di} />;
                    const isPast    = cell < todayStr;
                    const isWork    = workDays.has(cell);
                    const isSelected = cell === selectedDate;
                    return (
                      <button
                        key={cell}
                        disabled={isPast || !isWork}
                        onClick={() => { setSelectedDate(cell); go('time'); }}
                        className={`h-9 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-champagne text-obsidian'
                            : isPast || !isWork
                            ? 'text-white/20 cursor-not-allowed'
                            : 'bg-champagne/10 text-champagne hover:bg-champagne/25'
                        }`}
                      >
                        {parseInt(cell.slice(8))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-3 text-center">Золотом выделены рабочие дни специалиста</p>
          </>
        )}

        {/* ── Step: time ─────────────────────────────────────────── */}
        {step === 'time' && (
          <>
            <BackBtn onClick={() => go('date')} />
            <SectionTitle>Выберите время</SectionTitle>
            <p className="text-sm text-white/50 mb-4">{selectedDate && fmtDate(selectedDate)} · {service?.name}</p>
            {slots.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-white/50 text-sm">Нет свободных слотов на эту дату</p>
                <button onClick={() => go('date')} className="mt-3 text-champagne text-sm underline">Выбрать другую дату</button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setSelectedTime(t); go('contact'); }}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedTime === t
                        ? 'bg-champagne text-obsidian border-champagne'
                        : 'bg-white/5 border-white/10 text-white/80 hover:border-champagne/50 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step: contact ──────────────────────────────────────── */}
        {step === 'contact' && (
          <>
            <BackBtn onClick={() => go('time')} />
            <SectionTitle>Ваши данные</SectionTitle>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Имя *</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Введите имя"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-champagne/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Фамилия</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Введите фамилию"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-champagne/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Телефон *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 000 00 00"
                  type="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-champagne/60 transition-colors"
                />
              </div>
            </div>
            <NextBtn
              label="Продолжить"
              disabled={!firstName.trim() || !phone.trim()}
              onClick={() => go('confirm')}
            />
          </>
        )}

        {/* ── Step: confirm ──────────────────────────────────────── */}
        {step === 'confirm' && (
          <>
            <BackBtn onClick={() => go('contact')} />
            <SectionTitle>Подтвердите запись</SectionTitle>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3 mb-4">
              <Row label="Направление" value={dept === 'MASSAGE' ? 'Массаж' : 'Косметология'} />
              <Row label="Специалист"  value={specialist?.name ?? ''} />
              <Row label="Процедура"   value={service?.name ?? ''} />
              <Row label="Длительность" value={fmtDuration(service?.duration ?? 0)} />
              <Row label="Дата"        value={selectedDate ? fmtDate(selectedDate) : ''} />
              <Row label="Время"       value={selectedTime ?? ''} />
              <div className="border-t border-white/10 pt-3">
                <Row label="Стоимость" value={fmtPrice(service?.price ?? 0)} highlight />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3">
              <Row label="Имя"     value={`${firstName} ${lastName}`.trim()} />
              <Row label="Телефон" value={phone} />
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}
            <NextBtn label="Записаться" onClick={submitBooking} loading={loading} />
          </>
        )}

        {/* ── Step: done ─────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center py-4">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d4af37, #f5e091)' }}
            >
              <Check size={28} className="text-obsidian" />
            </div>
            <h2 className="font-serif text-2xl text-white mb-3">Запись создана!</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Мы свяжемся с вами по номеру <span className="text-white">{phone}</span> для подтверждения.
            </p>
            {bookingId && (
              <p className="text-xs text-white/30 mb-6">Номер записи: {bookingId.slice(0, 8).toUpperCase()}</p>
            )}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left flex flex-col gap-2 mb-6">
              <Row label="Специалист" value={specialist?.name ?? ''} />
              <Row label="Процедура"  value={service?.name ?? ''} />
              <Row label="Дата"       value={selectedDate ? fmtDate(selectedDate) : ''} />
              <Row label="Время"      value={selectedTime ?? ''} />
            </div>
            <button
              onClick={() => {
                setStep('dept'); setDept(null); setSpecialist(null); setService(null);
                setSelectedDate(null); setSelectedTime(null);
                setFirstName(''); setLastName(''); setPhone('');
                setBookingId(null);
              }}
              className="text-champagne text-sm underline hover:no-underline"
            >
              Записаться ещё раз
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-white/25">© {new Date().getFullYear()} Shante Lyur. Все права защищены.</p>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-white/50">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-champagne' : 'text-white'}`}>{value}</span>
    </div>
  );
}
