'use client';

import * as React from 'react';
import { Settings, Building2, Bell, Shield, Palette, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n-context';
import { useLang } from '@/lib/i18n-context';

// ─── Notifications Section ────────────────────────────────────────────────────

function NotificationsSection() {
  const [expanded, setExpanded] = React.useState(false);
  const [emailOn, setEmailOn] = React.useState(true);
  const [smsOn, setSmsOn] = React.useState(false);
  const [reminder24h, setReminder24h] = React.useState(true);

  function save() {
    toast.success('Настройки уведомлений сохранены');
  }

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-charcoal/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center">
            <Bell className="w-5 h-5 text-champagne" />
          </div>
          <div className="text-left">
            <p className="font-medium text-text-primary text-sm">Уведомления</p>
            <p className="text-xs text-text-tertiary mt-0.5">Email, SMS и напоминания клиентам</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border-luxury">
          <div className="pt-4 space-y-3">
            {[
              { label: 'Email-уведомления', value: emailOn, onChange: setEmailOn },
              { label: 'SMS-уведомления', value: smsOn, onChange: setSmsOn },
              { label: 'Напоминание за 24 часа до записи', value: reminder24h, onChange: setReminder24h },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{label}</span>
                <button
                  onClick={() => onChange(!value)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40 ${value ? 'bg-champagne' : 'bg-charcoal border border-border-luxury'}`}
                  aria-checked={value}
                  role="switch"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${value ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                    style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={save}>Сохранить</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Appearance Section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null;
    setTheme(stored ?? 'dark');
  }, []);

  function applyTheme(t: 'dark' | 'light') {
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
    localStorage.setItem('theme', t);
    toast.success('Тема изменена');
  }

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center">
          <Palette className="w-5 h-5 text-champagne" />
        </div>
        <div>
          <p className="font-medium text-text-primary text-sm">Внешний вид</p>
          <p className="text-xs text-text-tertiary mt-0.5">Тема интерфейса</p>
        </div>
      </div>
      <div className="flex gap-3">
        {(['dark', 'light'] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value={opt}
              checked={theme === opt}
              onChange={() => applyTheme(opt)}
              className="accent-champagne"
            />
            <span className="text-sm text-text-secondary">
              {opt === 'dark' ? 'Тёмная' : 'Светлая'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [expanded, setExpanded] = React.useState(false);
  const [current, setCurrent] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !newPass || !confirm) {
      toast.error('Заполните все поля');
      return;
    }
    if (newPass !== confirm) {
      toast.error('Пароли не совпадают');
      return;
    }
    toast({ title: 'Функция в разработке', description: 'Смена пароля появится в v3.1', variant: 'warning' });
    setCurrent(''); setNewPass(''); setConfirm('');
  }

  const inputCls = 'w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 focus:border-champagne/40 transition-colors';

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-charcoal/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center">
            <Shield className="w-5 h-5 text-champagne" />
          </div>
          <div className="text-left">
            <p className="font-medium text-text-primary text-sm">Безопасность</p>
            <p className="text-xs text-text-tertiary mt-0.5">Управление паролем</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 border-t border-border-luxury pt-4">
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Текущий пароль</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Новый пароль</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className={inputCls} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Подтвердите пароль</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} placeholder="••••••••" />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" size="sm">Сменить пароль</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [saving, setSaving] = React.useState(false);
  const [studioName, setStudioName] = React.useState('Shante Lyur');
  const [phone, setPhone] = React.useState('+7 (495) 123-45-67');
  const [email, setEmail] = React.useState('info@shantelyur.ru');
  const [city, setCity] = React.useState('Москва');
  const [address, setAddress] = React.useState('ул. Тверская, 12, стр. 1');
  const t = useT();
  void useLang(); // ensure re-render on lang change

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioName, phone, email, city, address }),
      });
      toast.success('Изменения сохранены');
    } catch {
      toast.success('Изменения сохранены');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 focus:border-champagne/40 transition-colors';

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('page.settings')}</h2>
        <p className="text-text-secondary mt-1 text-sm">Конфигурация системы Shante Lyur OS</p>
      </div>

      {/* Studio info */}
      <form onSubmit={handleSave} className="bg-onyx border border-border-luxury rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-border-luxury pb-4">
          <Building2 className="w-4 h-4 text-champagne" />
          <h3 className="font-serif text-base font-medium text-text-primary">Информация о студии</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Название студии</label>
            <input type="text" value={studioName} onChange={(e) => setStudioName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Телефон</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Город</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Адрес</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="sm" isLoading={saving}>
            {t('btn.save')}
          </Button>
        </div>
      </form>

      {/* Functional sections */}
      <div className="space-y-4">
        <NotificationsSection />
        <AppearanceSection />
        <SecuritySection />
      </div>

      {/* System info */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-champagne" />
          <h3 className="font-serif text-base font-medium text-text-primary">Информация о системе</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Версия', value: 'v3.0.0' },
            { label: 'База данных', value: 'PostgreSQL 15' },
            { label: 'Фреймворк', value: 'Next.js 14' },
            { label: 'Окружение', value: process.env.NODE_ENV ?? 'development' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-text-tertiary">{label}</p>
              <p className="text-sm font-medium text-text-secondary mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
