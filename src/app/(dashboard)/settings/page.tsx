'use client';

import * as React from 'react';
import { Settings, Building2, Bell, Shield, Palette, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const settingsSections = [
  {
    id: 'studio',
    icon: Building2,
    title: 'Студия',
    description: 'Название, адрес, контакты, часы работы',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Уведомления',
    description: 'Email, SMS и push-уведомления клиентам',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Безопасность',
    description: 'Двухфакторная аутентификация, сессии',
  },
  {
    id: 'appearance',
    icon: Palette,
    title: 'Внешний вид',
    description: 'Тема, цвета, логотип студии',
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Платежи',
    description: 'ЮКасса, Робокасса, настройки комиссий',
  },
  {
    id: 'email',
    icon: Mail,
    title: 'Email / SMTP',
    description: 'Настройки почтового сервера',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
          Настройки
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          Конфигурация системы Shante Lyur OS
        </p>
      </div>

      {/* Studio info card */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-border-luxury pb-4">
          <Building2 className="w-4 h-4 text-champagne" />
          <h3 className="font-serif text-base font-medium text-text-primary">Информация о студии</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Название студии', value: 'Shante Lyur', type: 'text' },
            { label: 'Телефон', value: '+7 (495) 123-45-67', type: 'tel' },
            { label: 'Email', value: 'info@shantelyur.ru', type: 'email' },
            { label: 'Город', value: 'Москва', type: 'text' },
          ].map(({ label, value, type }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-text-tertiary mb-1.5">{label}</label>
              <input
                type={type}
                defaultValue={value}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 focus:border-champagne/40 transition-colors"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Адрес</label>
            <input
              type="text"
              defaultValue="ул. Тверская, 12, стр. 1"
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 focus:border-champagne/40 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm">
            Сохранить изменения
          </Button>
        </div>
      </div>

      {/* Other settings sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {settingsSections.slice(1).map(({ id, icon: Icon, title, description }) => (
          <button
            key={id}
            className="bg-onyx border border-border-luxury rounded-2xl p-5 text-left hover:border-champagne/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center mb-4 group-hover:bg-champagne/12 transition-colors">
              <Icon className="w-5 h-5 text-champagne" />
            </div>
            <h4 className="font-medium text-text-primary text-sm">{title}</h4>
            <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{description}</p>
          </button>
        ))}
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
