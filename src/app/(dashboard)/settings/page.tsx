'use client';

import * as React from 'react';
import { Sun, Moon, Globe, Bell, Shield, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

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

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
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
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors shrink-0',
          checked ? 'bg-champagne' : 'bg-charcoal border border-border-luxury',
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full transition-transform bg-white shadow-sm',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { lang, setLang } = useLanguage();

  const [isDark, setIsDark] = React.useState(true);
  const [emailNotif, setEmailNotif] = React.useState(false);
  const [bookingAlerts, setBookingAlerts] = React.useState(true);
  const [savedMsg, setSavedMsg] = React.useState(false);

  React.useEffect(() => {
    setIsDark(!document.documentElement.classList.contains('light'));
    try {
      setEmailNotif(localStorage.getItem('notif_email') === '1');
      setBookingAlerts(localStorage.getItem('notif_booking') !== '0');
    } catch {}
  }, []);

  const toggleTheme = (dark: boolean) => {
    setIsDark(dark);
    const html = document.documentElement;
    html.classList.toggle('light', !dark);
    html.classList.toggle('dark', dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
    flash();
  };

  const updateEmailNotif = (v: boolean) => {
    setEmailNotif(v);
    try { localStorage.setItem('notif_email', v ? '1' : '0'); } catch {}
    flash();
  };

  const updateBookingAlerts = (v: boolean) => {
    setBookingAlerts(v);
    try { localStorage.setItem('notif_booking', v ? '1' : '0'); } catch {}
    flash();
  };

  const flash = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
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
        {/* Appearance */}
        <SectionCard title="Внешний вид" description="Тема и язык интерфейса">
          {/* Theme */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Тема</p>
                <p className="text-xs text-text-tertiary mt-0.5">Выберите светлую или тёмную тему</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 ml-11">
              <button
                onClick={() => toggleTheme(true)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-colors',
                  isDark
                    ? 'border-champagne/40 bg-champagne/5 text-text-primary'
                    : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
                )}
              >
                <Moon className="w-4 h-4 text-champagne" />
                Тёмная
                {isDark && <Check className="w-3.5 h-3.5 text-champagne ml-auto" />}
              </button>
              <button
                onClick={() => toggleTheme(false)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-colors',
                  !isDark
                    ? 'border-champagne/40 bg-champagne/5 text-text-primary'
                    : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
                )}
              >
                <Sun className="w-4 h-4 text-champagne" />
                Светлая
                {!isDark && <Check className="w-3.5 h-3.5 text-champagne ml-auto" />}
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
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

        {/* Notifications */}
        <SectionCard title="Уведомления" description="Управление оповещениями системы">
          <ToggleRow
            icon={<Bell className="w-4 h-4" />}
            label="Email-уведомления"
            description="Отправлять уведомления о новых записях на email"
            checked={emailNotif}
            onChange={updateEmailNotif}
          />
          <ToggleRow
            icon={<Bell className="w-4 h-4" />}
            label="Оповещения о записях"
            description="Показывать счётчик новых записей в шапке"
            checked={bookingAlerts}
            onChange={updateBookingAlerts}
          />
        </SectionCard>

        {/* Studio info */}
        <SectionCard title="Студия" description="Информация о салоне">
          <InfoRow label="Название" value="Shante Lyur" />
          <InfoRow label="Город" value="Москва" />
          <InfoRow label="Система" value="Shante Lyur OS" />
          <InfoRow label="Версия" value="1.0.0" />
        </SectionCard>

        {/* Security */}
        <SectionCard title="Безопасность" description="Параметры доступа">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Сессия администратора</p>
                <p className="text-xs text-text-tertiary mt-0.5">Сессия активна · токен действует 8 часов</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-champagne bg-champagne/10 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
                Активна
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-charcoal text-text-secondary shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Двухфакторная аутентификация</p>
                <p className="text-xs text-text-tertiary mt-0.5">Будет доступно в следующем обновлении</p>
              </div>
              <span className="text-xs text-text-tertiary bg-charcoal px-2.5 py-1 rounded-lg border border-border-luxury ml-auto">Скоро</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
