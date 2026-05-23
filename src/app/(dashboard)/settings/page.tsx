'use client';

import * as React from 'react';
import {
  Settings,
  Building2,
  Clock,
  Bell,
  Shield,
  Users,
  CreditCard,
  Check,
  Edit2,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalonSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  openTime: string;
  closeTime: string;
  timezone: string;
  currency: string;
  slotDuration: number;
  bookingBuffer: number;
  maxAdvanceBookingDays: number;
  cancellationHours: number;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface StaffRole {
  id: string;
  name: string;
  members: number;
  permissions: string[];
  color: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SalonSettings = {
  name: 'Shanté Lyur',
  address: 'г. Москва, ул. Тверская, 14',
  phone: '+7 (495) 123-45-67',
  email: 'hello@shantelyur.ru',
  website: 'shantelyur.ru',
  openTime: '09:00',
  closeTime: '21:00',
  timezone: 'Europe/Moscow',
  currency: 'RUB',
  slotDuration: 30,
  bookingBuffer: 10,
  maxAdvanceBookingDays: 30,
  cancellationHours: 2,
};

const DEFAULT_NOTIFICATIONS: NotificationSetting[] = [
  { id: 'n1', label: 'Новые записи', description: 'Уведомление при создании новой записи', enabled: true },
  { id: 'n2', label: 'Отмены записей', description: 'Уведомление при отмене клиентом', enabled: true },
  { id: 'n3', label: 'Напоминания клиентам', description: 'SMS/Email клиенту за 2 часа до записи', enabled: true },
  { id: 'n4', label: 'Ежедневный отчёт', description: 'Сводка по записям и выручке в конце дня', enabled: false },
  { id: 'n5', label: 'Низкий остаток', description: 'Уведомление при критическом уровне склада', enabled: true },
  { id: 'n6', label: 'Дни рождения клиентов', description: 'Напоминание о днях рождения для поздравлений', enabled: false },
];

const STAFF_ROLES: StaffRole[] = [
  { id: 'r1', name: 'Администратор', members: 2, permissions: ['Всё', 'Финансы', 'Настройки'], color: 'text-champagne' },
  { id: 'r2', name: 'Менеджер', members: 1, permissions: ['Записи', 'Клиенты', 'Отчёты'], color: 'text-sage' },
  { id: 'r3', name: 'Специалист', members: 6, permissions: ['Свой расписание', 'Свои клиенты'], color: 'text-blue-400' },
  { id: 'r4', name: 'Стажёр', members: 2, permissions: ['Просмотр расписания'], color: 'text-text-tertiary' },
];

type TabType = 'general' | 'notifications' | 'roles' | 'integrations';

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-luxury">
        <div className="w-8 h-8 rounded-lg bg-champagne/10 flex items-center justify-center text-champagne">
          {icon}
        </div>
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({ label, value, editable = true, onEdit }: {
  label: string;
  value: string | number;
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-luxury last:border-0">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-0.5">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
      {editable && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-champagne hover:bg-champagne/10 transition-all"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({ setting, onToggle }: { setting: NotificationSetting; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-luxury last:border-0">
      <div>
        <p className="text-sm font-medium text-text-primary">{setting.label}</p>
        <p className="text-xs text-text-tertiary mt-0.5">{setting.description}</p>
      </div>
      <button
        onClick={() => onToggle(setting.id)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-all duration-200',
          setting.enabled ? 'bg-champagne' : 'bg-charcoal border border-border-luxury',
        )}
        role="switch"
        aria-checked={setting.enabled}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
          setting.enabled ? 'left-[calc(100%-22px)]' : 'left-0.5',
        )} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useLocale();
  const [tab, setTab] = React.useState<TabType>('general');
  const [salonSettings] = React.useState<SalonSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = React.useState<NotificationSetting[]>(DEFAULT_NOTIFICATIONS);
  const [saved, setSaved] = React.useState(false);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'Основные', icon: <Building2 className="w-4 h-4" /> },
    { key: 'notifications', label: 'Уведомления', icon: <Bell className="w-4 h-4" /> },
    { key: 'roles', label: 'Роли и доступ', icon: <Shield className="w-4 h-4" /> },
    { key: 'integrations', label: 'Интеграции', icon: <CreditCard className="w-4 h-4" /> },
  ];

  function handleToggle(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">Настройки</h1>
          <p className="text-sm text-text-secondary mt-0.5">Конфигурация системы и управление доступом</p>
        </div>
        {tab !== 'roles' && tab !== 'integrations' && (
          <Button variant="primary" size="sm" onClick={handleSave}>
            {saved ? <><Check className="w-4 h-4 mr-1.5" />Сохранено</> : 'Сохранить'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-charcoal border border-border-luxury rounded-xl w-fit flex-wrap">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
              tab === tabItem.key
                ? 'bg-champagne/15 text-champagne'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {tabItem.icon}
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {tab === 'general' && (
        <div className="space-y-4">
          <SectionCard title="Информация о салоне" icon={<Building2 className="w-4 h-4" />}>
            <FieldRow label="Название" value={salonSettings.name} />
            <FieldRow label="Адрес" value={salonSettings.address} />
            <FieldRow label="Телефон" value={salonSettings.phone} />
            <FieldRow label="Email" value={salonSettings.email} />
            <FieldRow label="Сайт" value={salonSettings.website ?? '—'} />
          </SectionCard>

          <SectionCard title="Режим работы" icon={<Clock className="w-4 h-4" />}>
            <FieldRow label="Время открытия" value={salonSettings.openTime} />
            <FieldRow label="Время закрытия" value={salonSettings.closeTime} />
            <FieldRow label="Часовой пояс" value={salonSettings.timezone} />
          </SectionCard>

          <SectionCard title="Правила записи" icon={<Settings className="w-4 h-4" />}>
            <FieldRow label="Длительность слота (мин)" value={salonSettings.slotDuration} />
            <FieldRow label="Буфер между записями (мин)" value={salonSettings.bookingBuffer} />
            <FieldRow label="Запись вперёд (дней)" value={salonSettings.maxAdvanceBookingDays} />
            <FieldRow label="Отмена не позднее (часов)" value={salonSettings.cancellationHours} />
          </SectionCard>

          <SectionCard title="Региональные параметры" icon={<Globe className="w-4 h-4" />}>
            <FieldRow label="Валюта" value={salonSettings.currency} />
            <FieldRow label="Язык интерфейса" value="Русский" />
          </SectionCard>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          <SectionCard title="Email и SMS уведомления" icon={<Bell className="w-4 h-4" />}>
            {notifications.map((n) => (
              <ToggleRow key={n.id} setting={n} onToggle={handleToggle} />
            ))}
          </SectionCard>
          <SectionCard title="Push-уведомления" icon={<Smartphone className="w-4 h-4" />}>
            <div className="py-6 text-center">
              <Smartphone className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-text-tertiary">Мобильное приложение в разработке</p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Roles */}
      {tab === 'roles' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 border-b border-border-luxury bg-charcoal/20">
            <span className="col-span-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Роль</span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary text-center">Участники</span>
            <span className="col-span-5 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Разрешения</span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary"></span>
          </div>
          <div className="divide-y divide-border-luxury">
            {STAFF_ROLES.map((role) => (
              <div key={role.id} className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 hover:bg-charcoal/30 transition-colors">
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-charcoal flex items-center justify-center">
                    <Shield className={cn('w-4 h-4', role.color)} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{role.name}</span>
                </div>
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-sm text-text-primary">{role.members}</span>
                  </div>
                </div>
                <div className="col-span-5 flex flex-wrap gap-1.5">
                  {role.permissions.map((perm) => (
                    <span key={perm} className="text-xs px-2 py-0.5 rounded-lg bg-charcoal text-text-secondary border border-border-luxury">
                      {perm}
                    </span>
                  ))}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button className="p-1.5 rounded-lg text-text-tertiary hover:text-champagne hover:bg-champagne/10 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrations */}
      {tab === 'integrations' && (
        <div className="space-y-4">
          {[
            { name: 'Яндекс.Касса', description: 'Онлайн-оплата через API Яндекс.Касса', connected: true, icon: '₽' },
            { name: 'Telegram Bot', description: 'Уведомления и запись через Telegram', connected: true, icon: '✈' },
            { name: 'Google Calendar', description: 'Синхронизация расписания с Google Calendar', connected: false, icon: '📅' },
            { name: 'WhatsApp Business', description: 'Напоминания клиентам через WhatsApp', connected: false, icon: '💬' },
            { name: '1С:Бухгалтерия', description: 'Выгрузка финансовых данных в 1С', connected: false, icon: '📊' },
          ].map((integration) => (
            <div key={integration.name} className="bg-onyx border border-border-luxury rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-charcoal border border-border-luxury flex items-center justify-center text-lg">
                  {integration.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{integration.name}</p>
                    {integration.connected && <Badge variant="success" dot>Подключено</Badge>}
                  </div>
                  <p className="text-xs text-text-tertiary mt-0.5">{integration.description}</p>
                </div>
              </div>
              <Button variant={integration.connected ? 'secondary' : 'primary'} size="sm">
                {integration.connected ? 'Настроить' : 'Подключить'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
