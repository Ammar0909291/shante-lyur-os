'use client';

import * as React from 'react';
import { Sun, Moon, Globe, Bell, Shield, Info, Check, CreditCard, Store, Users, Sparkles, Monitor, Layers, AlignJustify } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { useUIVersion } from '@/contexts/ui-version';

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-luxury">
        <h3 className="font-serif text-lg font-medium text-text-primary">{title}</h3>
        {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
      </div>
      <div className="divide-y divide-border-luxury">{children}</div>
    </div>
  );
}

function ToggleRow({ icon, label, description, checked, onChange }: {
  icon: React.ReactNode; label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', checked ? 'bg-champagne' : 'bg-charcoal border border-border-luxury')}
        aria-pressed={checked}
      >
        <span className={cn('absolute top-1 w-4 h-4 rounded-full transition-transform bg-white shadow-sm', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={cn('text-sm font-medium', accent ? 'text-champagne' : 'text-text-primary')}>{value}</p>
    </div>
  );
}

// ── Appearance: UI Mode selector ───────────────────────────────────────
const UI_MODES = [
  {
    value: 'legacy' as const,
    label: 'Classic CRM',
    labelRu: 'Классический CRM',
    desc: 'Стабильный рабочий интерфейс. Все привычные функции.',
  },
  {
    value: 'next' as const,
    label: 'Luxury Executive',
    labelRu: 'Luxury Executive',
    desc: 'Премиум-интерфейс. Улучшенная аналитика и визуализация.',
  },
] as const;

const DENSITY_OPTIONS = [
  { value: 'comfortable' as const, label: 'Комфортный', desc: 'Стандартные отступы. Удобно для длинных сессий.' },
  { value: 'compact'     as const, label: 'Компактный', desc: 'Более плотная сетка. Больше данных на экране.' },
] as const;

export default function SettingsPage() {
  const { lang, setLang } = useLanguage();
  const { version: uiMode, setVersion: setUiMode, density, setDensity } = useUIVersion();
  const [isDark, setIsDark] = React.useState(true);
  const [savedMsg, setSavedMsg] = React.useState(false);

  const [clientConfirmEmail, setClientConfirmEmail] = React.useState(true);
  const [clientReminderEmail, setClientReminderEmail] = React.useState(true);
  const [clientCancelEmail, setClientCancelEmail] = React.useState(true);
  const [clientSmsSend, setClientSmsSend] = React.useState(false);
  const [specNewBooking, setSpecNewBooking] = React.useState(true);
  const [specCancellation, setSpecCancellation] = React.useState(true);
  const [specDailySummary, setSpecDailySummary] = React.useState(false);
  const [cashEnabled, setCashEnabled] = React.useState(true);
  const [cardTerminalEnabled, setCardTerminalEnabled] = React.useState(true);
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = React.useState(false);
  const [autoConfirm, setAutoConfirm] = React.useState(false);
  const [showRevenue, setShowRevenue] = React.useState(true);
  const [onlineBookingEnabled, setOnlineBookingEnabled] = React.useState(true);
  const [bookingToggleSaving, setBookingToggleSaving] = React.useState(false);

  React.useEffect(() => {
    // Load online booking toggle from DB
    fetch('/api/v1/config')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.online_booking_enabled !== undefined) {
          setOnlineBookingEnabled(j.data.online_booking_enabled !== 'false');
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    setIsDark(!document.documentElement.classList.contains('light'));
    try {
      const stored = localStorage.getItem('settings');
      if (stored) {
        const s = JSON.parse(stored) as Record<string, boolean>;
        if (s.clientConfirmEmail !== undefined) setClientConfirmEmail(s.clientConfirmEmail);
        if (s.clientReminderEmail !== undefined) setClientReminderEmail(s.clientReminderEmail);
        if (s.clientCancelEmail !== undefined) setClientCancelEmail(s.clientCancelEmail);
        if (s.clientSmsSend !== undefined) setClientSmsSend(s.clientSmsSend);
        if (s.specNewBooking !== undefined) setSpecNewBooking(s.specNewBooking);
        if (s.specCancellation !== undefined) setSpecCancellation(s.specCancellation);
        if (s.specDailySummary !== undefined) setSpecDailySummary(s.specDailySummary);
        if (s.cashEnabled !== undefined) setCashEnabled(s.cashEnabled);
        if (s.cardTerminalEnabled !== undefined) setCardTerminalEnabled(s.cardTerminalEnabled);
        if (s.onlinePaymentsEnabled !== undefined) setOnlinePaymentsEnabled(s.onlinePaymentsEnabled);
        if (s.autoConfirm !== undefined) setAutoConfirm(s.autoConfirm);
        if (s.showRevenue !== undefined) setShowRevenue(s.showRevenue);
      }
    } catch {}
  }, []);

  const save = (patch: Record<string, unknown>) => {
    try {
      const stored = localStorage.getItem('settings');
      const existing = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
      localStorage.setItem('settings', JSON.stringify({ ...existing, ...patch }));
    } catch {}
    flash();
  };

  const toggleTheme = (dark: boolean) => {
    setIsDark(dark);
    document.documentElement.classList.toggle('light', !dark);
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
    flash();
  };

  const flash = () => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); };

  const tog = (setter: (v: boolean) => void, key: string, val: boolean) => {
    setter(val); save({ [key]: val });
  };

  const toggleOnlineBooking = async (val: boolean) => {
    setOnlineBookingEnabled(val);
    setBookingToggleSaving(true);
    try {
      await fetch('/api/v1/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online_booking_enabled: String(val) }),
      });
      flash();
    } finally {
      setBookingToggleSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Настройки</h2>
          <p className="text-text-secondary mt-1 text-sm">Персонализация и параметры системы</p>
        </div>
        {savedMsg && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/20 text-champagne text-sm animate-fade-in">
            <Check className="w-4 h-4" />
            Сохранено
          </div>
        )}
      </div>

      <div className="space-y-5 max-w-2xl">

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <SectionCard title="Внешний вид" description="Интерфейс, тема и плотность">

          {/* UI Mode */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Режим интерфейса</p>
                <p className="text-xs text-text-tertiary mt-0.5">Выберите рабочее пространство</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-11">
              {UI_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => { setUiMode(mode.value); flash(); }}
                  className={cn(
                    'relative flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-150',
                    uiMode === mode.value
                      ? 'border-champagne/40 bg-champagne/5 text-text-primary'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-champagne shrink-0" />
                      <span className="text-sm font-medium">{mode.labelRu}</span>
                    </div>
                    {uiMode === mode.value && (
                      <Check className="w-3.5 h-3.5 text-champagne shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary leading-relaxed">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="px-6 py-5 border-t border-border-luxury">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Цветовая тема</p>
                <p className="text-xs text-text-tertiary mt-0.5">Применяется к обоим режимам</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 ml-11">
              {[
                { dark: true,  label: 'Тёмная',  Icon: Moon },
                { dark: false, label: 'Светлая', Icon: Sun  },
              ].map(({ dark, label, Icon }) => (
                <button
                  key={label}
                  onClick={() => toggleTheme(dark)}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-colors',
                    isDark === dark
                      ? 'border-champagne/40 bg-champagne/5 text-text-primary'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
                  )}
                >
                  <Icon className="w-4 h-4 text-champagne" />
                  {label}
                  {isDark === dark && <Check className="w-3.5 h-3.5 text-champagne ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="px-6 py-5 border-t border-border-luxury">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                <AlignJustify className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Плотность</p>
                <p className="text-xs text-text-tertiary mt-0.5">Компактность элементов интерфейса</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-11">
              {DENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDensity(opt.value); flash(); }}
                  className={cn(
                    'flex flex-col items-start gap-1 px-4 py-3.5 rounded-xl border text-left transition-all duration-150',
                    density === opt.value
                      ? 'border-champagne/40 bg-champagne/5 text-text-primary'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {density === opt.value && <Check className="w-3.5 h-3.5 text-champagne shrink-0" />}
                  </div>
                  <p className="text-xs text-text-tertiary leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
            {density === 'compact' && uiMode === 'legacy' && (
              <p className="text-xs text-text-tertiary mt-3 ml-11 bg-charcoal/50 rounded-lg px-3 py-2 border border-border-luxury">
                Компактный режим применяется к Luxury интерфейсу. Переключитесь на Luxury Executive для эффекта.
              </p>
            )}
          </div>

          {/* Language */}
          <div className="px-6 py-5 border-t border-border-luxury">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Язык</p>
                <p className="text-xs text-text-tertiary mt-0.5">Язык интерфейса</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 ml-11">
              {(['ru', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); flash(); }}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-colors',
                    lang === l
                      ? 'border-champagne/40 bg-champagne/5 text-text-primary'
                      : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
                  )}
                >
                  <span className="text-base">{l === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                  {l === 'ru' ? 'Русский' : 'English'}
                  {lang === l && <Check className="w-3.5 h-3.5 text-champagne ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Client Notifications */}
        <SectionCard title="Уведомления клиентам" description="Автоматические оповещения для клиентов">
          <ToggleRow icon={<Bell className="w-4 h-4" />} label="Подтверждение записи (Email)" description="Отправлять email при создании записи" checked={clientConfirmEmail} onChange={(v) => tog(setClientConfirmEmail, 'clientConfirmEmail', v)} />
          <ToggleRow icon={<Bell className="w-4 h-4" />} label="Напоминание за 24 часа (Email)" description="Отправлять напоминание накануне визита" checked={clientReminderEmail} onChange={(v) => tog(setClientReminderEmail, 'clientReminderEmail', v)} />
          <ToggleRow icon={<Bell className="w-4 h-4" />} label="Уведомление об отмене (Email)" description="Информировать клиента при отмене записи" checked={clientCancelEmail} onChange={(v) => tog(setClientCancelEmail, 'clientCancelEmail', v)} />
          <ToggleRow icon={<Bell className="w-4 h-4" />} label="SMS-уведомления" description="Требует настройки SMS-шлюза (задайте SMS_PROVIDER_KEY)" checked={clientSmsSend} onChange={(v) => tog(setClientSmsSend, 'clientSmsSend', v)} />
        </SectionCard>

        {/* Specialist Notifications */}
        <SectionCard title="Уведомления специалистам" description="Оповещения для сотрудников">
          <ToggleRow icon={<Sparkles className="w-4 h-4" />} label="Новая запись" description="Уведомлять специалиста о новых записях к нему" checked={specNewBooking} onChange={(v) => tog(setSpecNewBooking, 'specNewBooking', v)} />
          <ToggleRow icon={<Sparkles className="w-4 h-4" />} label="Отмена или перенос" description="Уведомлять об отменах и переносах" checked={specCancellation} onChange={(v) => tog(setSpecCancellation, 'specCancellation', v)} />
          <ToggleRow icon={<Sparkles className="w-4 h-4" />} label="Утренняя сводка" description="Расписание на день отправляется утром" checked={specDailySummary} onChange={(v) => tog(setSpecDailySummary, 'specDailySummary', v)} />
        </SectionCard>

        {/* Payment Settings */}
        <SectionCard title="Оплата" description="Методы оплаты и платёжные шлюзы">
          <ToggleRow icon={<CreditCard className="w-4 h-4" />} label="Наличные" description="Принимать оплату наличными" checked={cashEnabled} onChange={(v) => tog(setCashEnabled, 'cashEnabled', v)} />
          <ToggleRow icon={<CreditCard className="w-4 h-4" />} label="Банковский терминал" description="Оплата картой через терминал на кассе" checked={cardTerminalEnabled} onChange={(v) => tog(setCardTerminalEnabled, 'cardTerminalEnabled', v)} />
          <ToggleRow icon={<CreditCard className="w-4 h-4" />} label="Онлайн-оплата" description="YooKassa / Robokassa (задайте ключи API в .env)" checked={onlinePaymentsEnabled} onChange={(v) => tog(setOnlinePaymentsEnabled, 'onlinePaymentsEnabled', v)} />
          <div className="px-6 py-3">
            <p className="text-xs text-text-tertiary">
              Переменные окружения для онлайн-оплаты:
              <span className="text-champagne font-mono ml-1">YOOKASSA_SHOP_ID</span>,
              <span className="text-champagne font-mono ml-1">YOOKASSA_SECRET_KEY</span>,
              <span className="text-champagne font-mono ml-1">ROBOKASSA_MERCHANT_LOGIN</span>
            </p>
          </div>
        </SectionCard>

        {/* Operational */}
        <SectionCard title="Операционные настройки" description="Поведение системы записи">
          <ToggleRow icon={<Store className="w-4 h-4" />} label="Автоподтверждение записей" description="Автоматически подтверждать новые записи без ручной проверки" checked={autoConfirm} onChange={(v) => tog(setAutoConfirm, 'autoConfirm', v)} />
          <ToggleRow icon={<Users className="w-4 h-4" />} label="Выручка видна специалистам" description="Разрешить специалистам видеть свою выручку в профиле" checked={showRevenue} onChange={(v) => tog(setShowRevenue, 'showRevenue', v)} />
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Онлайн-запись для клиентов</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Публичная страница&nbsp;
                  <a href="/book" target="_blank" className="text-champagne hover:underline">/book</a>
                  {onlineBookingEnabled ? ' — доступна клиентам' : ' — закрыта для клиентов'}
                  {bookingToggleSaving && <span className="ml-2 opacity-60">сохранение…</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleOnlineBooking(!onlineBookingEnabled)}
              disabled={bookingToggleSaving}
              className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50', onlineBookingEnabled ? 'bg-champagne' : 'bg-charcoal border border-border-luxury')}
              aria-pressed={onlineBookingEnabled}
            >
              <span className={cn('absolute top-1 w-4 h-4 rounded-full transition-transform bg-white shadow-sm', onlineBookingEnabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        </SectionCard>

        {/* Studio info */}
        <SectionCard title="О студии" description="Информация о салоне">
          <InfoRow label="Название" value="Shante Lyur" />
          <InfoRow label="Адрес" value="Свердловская область, Екатеринбург, улица Малышева, 3" />
          <InfoRow label="Город" value="Екатеринбург" />
          <InfoRow label="Система" value="Shante Lyur OS" />
          <InfoRow label="Версия" value="3.0.0" accent />
        </SectionCard>

        {/* Security */}
        <SectionCard title="Безопасность" description="Параметры доступа и сессий">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0"><Shield className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Сессия администратора</p>
                <p className="text-xs text-text-tertiary mt-0.5">Токен действует 8 часов · автоматическое обновление при активности</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-champagne bg-champagne/10 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
                Активна
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0"><Info className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Двухфакторная аутентификация (TOTP)</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Повышает безопасность входа через приложения типа Google Authenticator. Реализация запланирована.
                </p>
              </div>
              <span className="text-xs text-text-tertiary bg-charcoal px-2.5 py-1 rounded-lg border border-border-luxury ml-auto shrink-0">Запланировано</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
