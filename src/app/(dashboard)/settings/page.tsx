'use client';

import * as React from 'react';
import { Building2, Bell, CreditCard, Shield, Globe, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SettingSection {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'confirmed' | 'warning' | 'default';
}

const sections: SettingSection[] = [
  { id: 'notifications', icon: Bell, title: 'Уведомления', description: 'Email и SMS уведомления для клиентов и персонала' },
  { id: 'payments', icon: CreditCard, title: 'Оплата', description: 'Платёжные системы, ЮKassa, RoboKassa, наличные', badge: 'Настроено', badgeVariant: 'confirmed' },
  { id: 'security', icon: Shield, title: 'Безопасность', description: 'Смена пароля, двухфакторная аутентификация, сессии' },
  { id: 'localization', icon: Globe, title: 'Локализация', description: 'Язык, часовой пояс, формат дат и валюта' },
];

export default function SettingsPage() {
  const [studioName, setStudioName] = React.useState('Shante Lyur Wellness Studio');
  const [phone, setPhone] = React.useState('+7 (495) 000-00-00');
  const [email, setEmail] = React.useState('hello@shantelyur.ru');
  const [address, setAddress] = React.useState('Москва, ул. Арбат, 10');
  const [hours, setHours] = React.useState('Пн–Сб: 09:00–21:00, Вс: 10:00–19:00');
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // In a full implementation this would PATCH /api/admin/studio or similar
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleDangerReset() {
    if (window.confirm('Вы уверены? Это действие необратимо и удалит все данные студии.')) {
      // Would call DELETE /api/admin/data-reset in a full implementation
      window.alert('Сброс данных недоступен в демо-режиме.');
    }
  }

  function handleDangerDelete() {
    if (window.confirm('Вы уверены? Аккаунт и все данные будут удалены безвозвратно.')) {
      // Would call DELETE /api/admin/account in a full implementation
      window.alert('Удаление аккаунта недоступно в демо-режиме.');
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">Настройки</h2>
        <p className="text-sm text-text-secondary mt-0.5">Управление параметрами платформы</p>
      </div>

      {/* Studio info form */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-champagne" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-text-primary">Настройки студии</h3>
            <p className="text-xs text-text-secondary">Основная информация</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary" htmlFor="studioName">
                Название студии
              </label>
              <input
                id="studioName"
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary" htmlFor="phone">
                Телефон
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary" htmlFor="emailField">
                Email
              </label>
              <input
                id="emailField"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary" htmlFor="address">
                Адрес
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20 transition-colors"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary" htmlFor="hours">
                Часы работы
              </label>
              <input
                id="hours"
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:border-champagne focus:ring-1 focus:ring-champagne/20 transition-colors"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-sage animate-fade-in">
                <Check className="w-4 h-4" />
                Сохранено
              </span>
            )}
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </div>

      {/* Other settings sections */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden divide-y divide-border-luxury">
        {sections.map(({ id, icon: Icon, title, description, badge, badgeVariant }) => (
          <button
            key={id}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-charcoal/40 transition-colors text-left group"
            onClick={() => {
              // Navigate or open section — stubs for sections not yet implemented
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-champagne" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary text-sm">{title}</p>
                {badge && <Badge variant={badgeVariant ?? 'default'}>{badge}</Badge>}
              </div>
              <p className="text-xs text-text-secondary mt-0.5 truncate">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Danger zone */}
      <div className="bg-onyx border border-red-500/20 rounded-2xl p-6">
        <h3 className="font-serif text-lg font-medium text-red-400 mb-1">Опасная зона</h3>
        <p className="text-sm text-text-secondary mb-5">Эти действия необратимы. Пожалуйста, будьте осторожны.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="danger" size="md" onClick={handleDangerReset}>Сбросить все данные</Button>
          <Button variant="danger" size="md" onClick={handleDangerDelete}>Удалить аккаунт</Button>
        </div>
      </div>
    </div>
  );
}
