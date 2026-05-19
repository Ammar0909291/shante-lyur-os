'use client';

import * as React from 'react';
import { Sun, Moon, Globe, Bell, Shield, Building2 } from 'lucide-react';
import { useTheme } from '@/context/theme-context';
import { useLang } from '@/context/lang-context';
import { cn } from '@/lib/utils';

function SettingSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-luxury">
        <Icon className="w-4 h-4 text-champagne shrink-0" aria-hidden />
        <h3 className="font-serif text-base font-medium text-text-primary">{title}</h3>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
        checked ? 'bg-champagne' : 'bg-charcoal border border-border-light',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLang();

  const [notifyEmail, setNotifyEmail] = React.useState(true);
  const [notifySms, setNotifySms] = React.useState(false);
  const [notifyPush, setNotifyPush] = React.useState(true);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
          {t.nav.settings}
        </h2>
        <p className="text-text-secondary mt-1 text-sm">Настройки интерфейса и уведомлений</p>
      </div>

      {/* Appearance */}
      <SettingSection title="Внешний вид" icon={Sun}>
        <SettingRow
          label="Тема"
          description="Выберите тёмную или светлую тему интерфейса"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary mr-1">
              {theme === 'dark' ? 'Тёмная' : 'Светлая'}
            </span>
            <div className="flex items-center gap-1 bg-charcoal rounded-lg p-1 border border-border-luxury">
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  theme === 'dark' ? 'bg-champagne/12 text-champagne' : 'text-text-secondary hover:text-text-primary',
                )}
                aria-label="Тёмная тема"
              >
                <Moon className="w-3.5 h-3.5" aria-hidden />
                Тёмная
              </button>
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  theme === 'light' ? 'bg-champagne/12 text-champagne' : 'text-text-secondary hover:text-text-primary',
                )}
                aria-label="Светлая тема"
              >
                <Sun className="w-3.5 h-3.5" aria-hidden />
                Светлая
              </button>
            </div>
          </div>
        </SettingRow>
      </SettingSection>

      {/* Language */}
      <SettingSection title="Язык / Language" icon={Globe}>
        <SettingRow
          label="Язык интерфейса"
          description="Выберите язык для отображения текста в приложении"
        >
          <div className="flex items-center gap-1 bg-charcoal rounded-lg p-1 border border-border-luxury">
            <button
              onClick={() => lang !== 'ru' && toggleLang()}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-semibold transition-colors',
                lang === 'ru' ? 'bg-champagne/12 text-champagne' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              RU
            </button>
            <button
              onClick={() => lang !== 'en' && toggleLang()}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-semibold transition-colors',
                lang === 'en' ? 'bg-champagne/12 text-champagne' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              EN
            </button>
          </div>
        </SettingRow>
      </SettingSection>

      {/* Notifications */}
      <SettingSection title="Уведомления" icon={Bell}>
        <SettingRow
          label="Email-уведомления"
          description="Получать уведомления о записях на email"
        >
          <Toggle checked={notifyEmail} onChange={setNotifyEmail} label="Email-уведомления" />
        </SettingRow>
        <SettingRow
          label="SMS-уведомления"
          description="Получать SMS о записях и изменениях"
        >
          <Toggle checked={notifySms} onChange={setNotifySms} label="SMS-уведомления" />
        </SettingRow>
        <SettingRow
          label="Push-уведомления"
          description="Уведомления в браузере"
        >
          <Toggle checked={notifyPush} onChange={setNotifyPush} label="Push-уведомления" />
        </SettingRow>
      </SettingSection>

      {/* Security */}
      <SettingSection title="Безопасность" icon={Shield}>
        <SettingRow
          label="Двухфакторная аутентификация"
          description="Дополнительная защита аккаунта через SMS или приложение"
        >
          <span className="text-xs text-text-tertiary bg-charcoal border border-border-luxury px-3 py-1.5 rounded-lg">
            Скоро
          </span>
        </SettingRow>
        <SettingRow
          label="Активные сессии"
          description="Просмотр и управление активными сессиями"
        >
          <span className="text-xs text-text-tertiary bg-charcoal border border-border-luxury px-3 py-1.5 rounded-lg">
            Скоро
          </span>
        </SettingRow>
      </SettingSection>

      {/* Studio info */}
      <SettingSection title="О студии" icon={Building2}>
        <SettingRow label="Версия платформы" description="Shante Lyur OS">
          <span className="text-xs text-champagne font-mono bg-champagne/6 border border-champagne/20 px-3 py-1.5 rounded-lg">
            v3.0.0
          </span>
        </SettingRow>
      </SettingSection>
    </div>
  );
}
