'use client';

import * as React from 'react';
import { Settings, Bell, Shield, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SECTIONS = [
  {
    icon: User,
    title: 'Профиль',
    description: 'Имя, контакты, аватар',
  },
  {
    icon: Bell,
    title: 'Уведомления',
    description: 'Email и SMS-оповещения',
  },
  {
    icon: Shield,
    title: 'Безопасность',
    description: 'Пароль и двухфакторная аутентификация',
  },
  {
    icon: Settings,
    title: 'Настройки студии',
    description: 'Рабочие часы, локации, правила бронирования',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-2xl font-medium text-text-primary">Настройки</h2>
        <p className="text-text-secondary text-sm mt-0.5">Управление системой и аккаунтом</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              className="cursor-pointer hover:border-champagne/40 transition-colors"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-champagne/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-champagne" />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-text-tertiary">Нажмите для настройки</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
