import * as React from 'react';
import { Building2, Bell, CreditCard, Shield, Globe, ChevronRight } from 'lucide-react';
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
  {
    id: 'studio',
    icon: Building2,
    title: 'Настройки студии',
    description: 'Название, адрес, часы работы, контактная информация',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Уведомления',
    description: 'Email и SMS уведомления для клиентов и персонала',
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Оплата',
    description: 'Платёжные системы, ЮKassa, RoboKassa, наличные',
    badge: 'Настроено',
    badgeVariant: 'confirmed',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Безопасность',
    description: 'Смена пароля, двухфакторная аутентификация, сессии',
  },
  {
    id: 'localization',
    icon: Globe,
    title: 'Локализация',
    description: 'Язык, часовой пояс, формат дат и валюта',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
          Настройки
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Управление параметрами платформы
        </p>
      </div>

      {/* Studio info (expanded) */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-champagne/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-champagne" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-text-primary">Настройки студии</h3>
            <p className="text-xs text-text-secondary">Основная информация</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Название студии
            </label>
            <div className="h-11 px-4 rounded-lg bg-charcoal border border-border-luxury flex items-center text-sm text-text-primary">
              Shante Lyur Wellness Studio
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Телефон
            </label>
            <div className="h-11 px-4 rounded-lg bg-charcoal border border-border-luxury flex items-center text-sm text-text-secondary">
              +7 (495) 000-00-00
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Email
            </label>
            <div className="h-11 px-4 rounded-lg bg-charcoal border border-border-luxury flex items-center text-sm text-text-secondary">
              hello@shantelyur.ru
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Адрес
            </label>
            <div className="h-11 px-4 rounded-lg bg-charcoal border border-border-luxury flex items-center text-sm text-text-secondary">
              Москва, ул. Арбат, 10
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Часы работы
            </label>
            <div className="h-11 px-4 rounded-lg bg-charcoal border border-border-luxury flex items-center text-sm text-text-secondary">
              Пн–Сб: 09:00–21:00, Вс: 10:00–19:00
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="primary" size="md">
            Сохранить изменения
          </Button>
        </div>
      </div>

      {/* Other sections as nav items */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden divide-y divide-border-luxury">
        {sections.slice(1).map(({ id, icon: Icon, title, description, badge, badgeVariant }) => (
          <button
            key={id}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-charcoal/40 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-champagne/8 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-champagne" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary text-sm">{title}</p>
                {badge && (
                  <Badge variant={badgeVariant ?? 'default'}>{badge}</Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5 truncate">{description}</p>
            </div>
            <ChevronRight
              className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors shrink-0"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {/* Danger zone */}
      <div className="bg-onyx border border-red-500/20 rounded-2xl p-6">
        <h3 className="font-serif text-lg font-medium text-red-400 mb-1">Опасная зона</h3>
        <p className="text-sm text-text-secondary mb-5">
          Эти действия необратимы. Пожалуйста, будьте осторожны.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="danger" size="md">
            Сбросить все данные
          </Button>
          <Button variant="danger" size="md">
            Удалить аккаунт
          </Button>
        </div>
      </div>
    </div>
  );
}
