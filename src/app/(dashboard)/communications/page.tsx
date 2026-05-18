import * as React from 'react';
import {
  Bell,
  Send,
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Gift,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';

const CHANNEL_CONFIG = {
  EMAIL:    { label: 'Email',    color: 'bg-blue-500/20 text-blue-300' },
  SMS:      { label: 'SMS',     color: 'bg-purple-500/20 text-purple-300' },
  IN_APP:   { label: 'In-App',  color: 'bg-slate-500/20 text-slate-300' },
  PUSH:     { label: 'Push',    color: 'bg-amber-500/20 text-amber-300' },
  TELEGRAM: { label: 'Telegram', color: 'bg-sky-500/20 text-sky-300' },
};

const TYPE_CONFIG = {
  APPOINTMENT_CONFIRMED: { label: 'Подтверждение записи', icon: CheckCircle },
  APPOINTMENT_REMINDER:  { label: 'Напоминание о записи', icon: Clock },
  APPOINTMENT_CANCELLED: { label: 'Отмена записи',        icon: AlertCircle },
  FOLLOW_UP:             { label: 'Обратная связь',       icon: MessageSquare },
  REACTIVATION:          { label: 'Реактивация',          icon: RotateCcw },
  LOYALTY_REMINDER:      { label: 'Бонусные баллы',       icon: Gift },
  MEMBERSHIP_RENEWAL:    { label: 'Продление абонемента', icon: CalendarClock },
  RECURRING_TREATMENT:   { label: 'Рекомендация',         icon: TrendingUp },
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Ожидает', color: 'bg-amber-500/20 text-amber-300' },
  SENT:      { label: 'Отправлено', color: 'bg-blue-500/20 text-blue-300' },
  DELIVERED: { label: 'Доставлено', color: 'bg-green-500/20 text-green-300' },
  READ:      { label: 'Прочитано', color: 'bg-emerald-500/20 text-emerald-300' },
  FAILED:    { label: 'Ошибка', color: 'bg-red-500/20 text-red-300' },
};

const mockStats = {
  sentToday: 48,
  deliveredToday: 44,
  readRate: 78,
  unsubscribed: 3,
};

const mockRecent = [
  { id: '1', client: 'Анна Соколова',    type: 'APPOINTMENT_CONFIRMED', channel: 'EMAIL',    status: 'READ',      sentAt: '10:32', title: 'Запись подтверждена' },
  { id: '2', client: 'Мария Иванова',    type: 'APPOINTMENT_REMINDER',  channel: 'EMAIL',    status: 'DELIVERED', sentAt: '09:15', title: 'Напоминание о записи' },
  { id: '3', client: 'Алина Петрова',    type: 'FOLLOW_UP',             channel: 'EMAIL',    status: 'SENT',      sentAt: '08:00', title: 'Обратная связь после визита' },
  { id: '4', client: 'Наталья Сидорова', type: 'LOYALTY_REMINDER',      channel: 'IN_APP',   status: 'READ',      sentAt: '08:00', title: '+250 бонусных баллов' },
  { id: '5', client: 'Екатерина Ли',     type: 'MEMBERSHIP_RENEWAL',    channel: 'EMAIL',    status: 'PENDING',   sentAt: '08:00', title: 'Абонемент истекает через 5 дней' },
  { id: '6', client: 'Светлана Ким',     type: 'REACTIVATION',          channel: 'EMAIL',    status: 'SENT',      sentAt: 'вчера', title: 'Мы скучаем по вам!' },
];

const mockSchedulers = [
  { id: 'follow-up',    label: 'Обратная связь',    description: 'Через 3 дня после визита', lastRun: '18.05.2026 08:00', sent: 12, icon: MessageSquare },
  { id: 'reminders',   label: 'Напоминания',        description: 'За 24ч до записи',         lastRun: '18.05.2026 07:00', sent: 8,  icon: Clock },
  { id: 'renewals',    label: 'Продление абонементов', description: 'За 7 дней до истечения', lastRun: '18.05.2026 08:00', sent: 5, icon: CalendarClock },
  { id: 'reactivation', label: 'Реактивация клиентов', description: 'Нет визитов 30+ дней',  lastRun: '17.05.2026 08:00', sent: 3, icon: RotateCcw },
];

const mockTemplates = [
  { type: 'APPOINTMENT_CONFIRMED', channel: 'EMAIL',  name: 'Подтверждение записи', active: true },
  { type: 'APPOINTMENT_REMINDER',  channel: 'EMAIL',  name: 'Напоминание о записи', active: true },
  { type: 'FOLLOW_UP',             channel: 'EMAIL',  name: 'Обратная связь',       active: true },
  { type: 'REACTIVATION',          channel: 'EMAIL',  name: 'Реактивация клиента',  active: true },
  { type: 'MEMBERSHIP_RENEWAL',    channel: 'EMAIL',  name: 'Продление абонемента', active: true },
  { type: 'RECURRING_TREATMENT',   channel: 'EMAIL',  name: 'Рекомендация процедуры', active: false },
];

export default function CommunicationsPage() {
  const deliveryRate = mockStats.sentToday > 0
    ? Math.round((mockStats.deliveredToday / mockStats.sentToday) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-text-primary">Коммуникации</h1>
        <p className="text-sm text-text-tertiary mt-1">Уведомления, напоминания и история общения с клиентами</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Отправлено сегодня"
          value={mockStats.sentToday}
          icon={<Send className="w-5 h-5" />}
        />
        <StatCard
          title="Доставлено"
          value={`${deliveryRate}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{ value: 2.1, label: 'vs вчера', positive: true }}
        />
        <StatCard
          title="Открываемость"
          value={`${mockStats.readRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Отписок"
          value={mockStats.unsubscribed}
          icon={<Bell className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent notifications */}
        <div className="lg:col-span-2 bg-charcoal border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-text-primary">Последние уведомления</h2>
            <span className="text-xs text-text-tertiary">Сегодня</span>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-5 text-xs text-text-tertiary px-3 pb-1 border-b border-border-luxury">
              <span className="col-span-2">Клиент</span>
              <span>Тип</span>
              <span className="text-center">Канал</span>
              <span className="text-right">Статус</span>
            </div>
            {mockRecent.map((n) => {
              const TypeIcon = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG]?.icon ?? Bell;
              const typeLabel = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG]?.label ?? n.type;
              const channelCfg = CHANNEL_CONFIG[n.channel as keyof typeof CHANNEL_CONFIG];
              const statusCfg = STATUS_CONFIG[n.status as keyof typeof STATUS_CONFIG];
              return (
                <div key={n.id} className="grid grid-cols-5 items-center px-3 py-2.5 rounded-xl hover:bg-obsidian transition-colors">
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-text-primary">{n.client}</p>
                    <p className="text-xs text-text-tertiary">{n.sentAt}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    <p className="text-xs text-text-secondary truncate">{typeLabel}</p>
                  </div>
                  <div className="flex justify-center">
                    <Badge className={`text-xs ${channelCfg?.color ?? ''}`}>{channelCfg?.label ?? n.channel}</Badge>
                  </div>
                  <div className="flex justify-end">
                    <Badge className={`text-xs ${statusCfg?.color ?? ''}`}>{statusCfg?.label ?? n.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedulers */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-champagne" />
            <h2 className="text-base font-medium text-text-primary">Планировщики</h2>
          </div>
          <div className="space-y-3">
            {mockSchedulers.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="py-2.5 border-b border-border-luxury last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-champagne" />
                      <p className="text-sm font-medium text-text-primary">{s.label}</p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 text-xs">активен</Badge>
                  </div>
                  <p className="text-xs text-text-tertiary mb-1">{s.description}</p>
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>Последний запуск: {s.lastRun}</span>
                    <span className="text-text-secondary font-medium">+{s.sent} отпр.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-champagne" />
            <h2 className="text-base font-medium text-text-primary">Шаблоны уведомлений</h2>
          </div>
          <span className="text-xs text-text-tertiary">{mockTemplates.filter(t => t.active).length} активных</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockTemplates.map((t) => {
            const channelCfg = CHANNEL_CONFIG[t.channel as keyof typeof CHANNEL_CONFIG];
            const typeLabel = TYPE_CONFIG[t.type as keyof typeof TYPE_CONFIG]?.label ?? t.type;
            return (
              <div key={t.type} className="p-3 rounded-xl bg-obsidian border border-border-luxury">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-primary truncate">{t.name}</p>
                  <Badge className={`text-xs ml-2 shrink-0 ${t.active ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-300'}`}>
                    {t.active ? 'вкл' : 'выкл'}
                  </Badge>
                </div>
                <p className="text-xs text-text-tertiary mb-2 truncate">{typeLabel}</p>
                <Badge className={`text-xs ${channelCfg?.color ?? ''}`}>{channelCfg?.label}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Broadcast section */}
      <div className="bg-charcoal border border-border-luxury rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-champagne" />
          <h2 className="text-base font-medium text-text-primary">Массовая рассылка</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-3">
            <div className="p-3 rounded-xl bg-obsidian border border-border-luxury">
              <p className="text-xs text-text-tertiary mb-1">Заголовок</p>
              <p className="text-sm text-text-secondary italic">Специальное предложение для клиентов Shante Lyur</p>
            </div>
            <div className="p-3 rounded-xl bg-obsidian border border-border-luxury">
              <p className="text-xs text-text-tertiary mb-1">Текст сообщения</p>
              <p className="text-sm text-text-secondary italic">Дорогой клиент, представляем новую летнюю коллекцию процедур...</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-obsidian border border-border-luxury">
              <p className="text-xs text-text-tertiary mb-1">Аудитория</p>
              <p className="text-sm font-medium text-text-primary">Все клиенты</p>
              <p className="text-xs text-text-tertiary">~284 получателей</p>
            </div>
            <div className="p-3 rounded-xl bg-obsidian border border-border-luxury">
              <p className="text-xs text-text-tertiary mb-1">Канал</p>
              <Badge className="bg-blue-500/20 text-blue-300 text-xs">Email</Badge>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-3">Для отправки рассылки используйте API: POST /api/communications/broadcast</p>
      </div>
    </div>
  );
}
