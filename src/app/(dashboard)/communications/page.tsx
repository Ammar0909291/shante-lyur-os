'use client';

import * as React from 'react';
import {
  Send, MessageSquare, Phone, Bot, Mail,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, BarChart2, Settings, Zap,
  TrendingUp, Download, Save, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMPLATES } from '@/lib/communication/templates/definitions';
import { authHeaders } from '@/lib/client-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliveryStats {
  summary: { total: number; sent: number; delivered: number; failed: number; deliveryRate: number; periodDays: number };
  byChannel: Record<string, { total: number; sent: number; delivered: number; failed: number }>;
  dailyVolume: Array<{ day: string; channel: string; count: number }>;
  recentFailures: Array<{ id: string; channel: string; errorMessage: string | null; retryCount: number; createdAt: string; user: { firstName: string; lastName: string } | null }>;
  preferences: { whatsappEnabled: number; telegramEnabled: number; maxEnabled: number; emailEnabled: number };
}

interface QueueStatus {
  queue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  recentFailed: unknown[];
}

interface HistoryMessage {
  id: string; channel: string; status: string; body: string;
  recipientPhone: string | null; recipientChatId: string | null; recipientEmail: string | null;
  externalId: string | null; retryCount: number;
  sentAt: string | null; failedAt: string | null; errorMessage: string | null; createdAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
  template: { key: string; name: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  WHATSAPP: Phone, TELEGRAM: Bot, MAX: MessageSquare, EMAIL: Mail, IN_APP: Zap,
};

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: 'text-green-500', TELEGRAM: 'text-blue-400', MAX: 'text-violet-400',
  EMAIL: 'text-champagne', IN_APP: 'text-sage',
};

const STATUS_BADGE: Record<string, string> = {
  SENT:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DELIVERED:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  READ:       'bg-violet-500/10 text-violet-400 border-violet-500/20',
  FAILED:     'bg-red-500/10 text-red-400 border-red-500/20',
  DEAD_LETTER:'bg-red-900/20 text-red-300 border-red-800/40',
  PENDING:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  QUEUED:     'bg-blue-900/20 text-blue-300 border-blue-800/40',
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color ?? 'bg-charcoal')}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-serif text-2xl font-medium text-text-primary tabular-nums">{value}</p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const Icon = CHANNEL_ICONS[channel] ?? MessageSquare;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', CHANNEL_COLORS[channel] ?? 'text-text-tertiary')}>
      <Icon className="w-3 h-3" />
      {channel}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', STATUS_BADGE[status] ?? 'bg-charcoal text-text-tertiary border-border-luxury')}>
      {status}
    </span>
  );
}

// ─── Send Message Panel ───────────────────────────────────────────────────────

function SendPanel({ onSent }: { onSent: () => void }) {
  const [userId, setUserId] = React.useState('');
  const [channel, setChannel] = React.useState<'whatsapp' | 'telegram' | 'max' | 'email'>('telegram');
  const [templateKey, setTemplateKey] = React.useState('booking_confirmation');
  const [vars, setVars] = React.useState({
    clientName: 'Анна Смирнова',
    specialistName: 'Ирина Владимирова',
    serviceName: 'Тайский массаж',
    date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    time: '14:00',
    room: 'Кабинет №2',
    department: 'MASSAGE',
    amount: '3 500',
    currency: 'руб.',
  });
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; msg: string } | null>(null);

  const templateList = Object.values(TEMPLATES);
  const selectedTemplate = TEMPLATES[templateKey];
  const preview = selectedTemplate?.bodyRu(vars) ?? '';

  async function handleSend() {
    if (!userId.trim()) { setResult({ ok: false, msg: 'Укажите User ID получателя' }); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId, channel, templateKey, vars }),
      });
      const json = await res.json() as { success: boolean; data?: { delivered: boolean; error?: string; messageId: string } };
      if (json.success && json.data?.delivered) {
        setResult({ ok: true, msg: `✓ Отправлено (ID: ${json.data.messageId.slice(0, 8)}...)` });
        onSent();
      } else {
        setResult({ ok: false, msg: json.data?.error ?? 'Ошибка отправки' });
      }
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border-luxury flex items-center gap-2">
        <Send className="w-4 h-4 text-champagne" />
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Отправить сообщение</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">User ID получателя</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="uuid пользователя"
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Канал</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="max">MAX</option>
              <option value="email">Эл. почта</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-text-tertiary mb-1 block">Шаблон</label>
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary"
          >
            {templateList.map((t) => (
              <option key={t.key} value={t.key}>{t.nameRu}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(vars).map(([k, v]) => (
            <div key={k}>
              <label className="text-xs text-text-tertiary mb-1 block">{k}</label>
              <input
                value={v}
                onChange={(e) => setVars((prev) => ({ ...prev, [k]: e.target.value }))}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-xs text-text-primary"
              />
            </div>
          ))}
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-charcoal/50 border border-border-luxury rounded-xl p-3">
            <p className="text-xs text-text-tertiary mb-1.5 font-semibold uppercase tracking-wider">Предпросмотр</p>
            <p className="text-xs text-text-secondary whitespace-pre-line">{preview.replace(/<[^>]+>/g, '')}</p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-gradient text-obsidian font-semibold text-sm disabled:opacity-50"
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Отправка...' : 'Отправить'}
        </button>

        {result && (
          <div className={cn('flex items-center gap-2 text-sm px-3 py-2 rounded-lg', result.ok ? 'text-emerald-400 bg-emerald-900/20' : 'text-red-400 bg-red-900/20')}>
            {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {result.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Channel Settings Panel ───────────────────────────────────────────────────

const CONFIG_FIELDS: Array<{ key: string; label: string; placeholder: string; secret?: boolean }> = [
  { key: 'telegram_bot_token', label: 'Telegram Bot Token', placeholder: '1234567890:ABC...', secret: true },
  { key: 'whatsapp_access_token', label: 'WhatsApp Access Token', placeholder: 'EAAxxxxxxxx...', secret: true },
  { key: 'whatsapp_phone_id', label: 'WhatsApp Phone ID', placeholder: '123456789' },
  { key: 'max_bot_token', label: 'MAX Bot Token', placeholder: 'max-bot-token...', secret: true },
  { key: 'smtp_host', label: 'SMTP Хост', placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port', label: 'SMTP Порт', placeholder: '587' },
  { key: 'smtp_user', label: 'SMTP Пользователь', placeholder: 'noreply@salon.ru' },
  { key: 'smtp_pass', label: 'SMTP Пароль', placeholder: '••••••••', secret: true },
  { key: 'smtp_from', label: 'Email отправителя', placeholder: '"Shante Lyur" <noreply@salon.ru>' },
];

function SettingsPanel() {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [visible, setVisible] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/v1/config', { headers: authHeaders() });
        const json = await res.json() as { success: boolean; data?: Record<string, string> };
        if (json.success && json.data) setValues(json.data);
      } finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/v1/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(values),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-champagne" /></div>;

  const groups = [
    { title: 'Telegram', keys: ['telegram_bot_token'] },
    { title: 'WhatsApp', keys: ['whatsapp_access_token', 'whatsapp_phone_id'] },
    { title: 'MAX', keys: ['max_bot_token'] },
    { title: 'Email (SMTP)', keys: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-tertiary">Настройки применяются мгновенно. Существующие токены скрыты — введите новое значение чтобы обновить.</p>
      {groups.map(({ title, keys }) => (
        <div key={title} className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{title}</h3>
          </div>
          <div className="p-5 space-y-4">
            {keys.map((key) => {
              const field = CONFIG_FIELDS.find((f) => f.key === key)!;
              const isVisible = visible[key];
              return (
                <div key={key}>
                  <label className="text-xs text-text-tertiary mb-1.5 block">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.secret && !isVisible ? 'password' : 'text'}
                      value={values[key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary pr-9 placeholder-text-tertiary/40"
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-gradient text-obsidian font-semibold text-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Сохранено
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Auto Reminders Panel ─────────────────────────────────────────────────────

interface UpcomingBooking {
  id: string;
  startAt: string;
  clientName: string;
  specialistName: string;
  services: string;
  room: string;
  status: string;
  hoursUntil: number;
  window: string;
}

function AutoRemindersPanel() {
  const [bookings, setBookings] = React.useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const now = new Date();
        const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
        const res = await fetch(
          `/api/v1/appointments?from=${now.toISOString()}&to=${in48h.toISOString()}&status=PENDING,CONFIRMED&limit=100`,
          { headers: authHeaders() },
        );
        const json = await res.json() as { success: boolean; data?: { appointments: UpcomingBooking[] } };
        if (json.success && json.data?.appointments) setBookings(json.data.appointments);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  async function downloadExcel() {
    setDownloading(true);
    try {
      const res = await fetch('/api/v1/reminders/export', { headers: authHeaders() });
      if (!res.ok) { setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reminders-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  }

  const windowColor = (w: string) =>
    w === '2ч' ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : w === '24ч' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

  return (
    <div className="space-y-5">
      <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Автоматические напоминания клиентам</h3>
            <p className="text-xs text-text-tertiary">Система автоматически отправляет запрос на подтверждение записи за 48ч, 24ч и утром в день визита. Ниже показаны ближайшие записи.</p>
          </div>
          <button
            onClick={() => void downloadExcel()}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-champagne/30 bg-champagne/10 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50 shrink-0"
          >
            {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Скачать Excel
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '48 ч до визита', desc: 'Первое напоминание', color: 'text-blue-400' },
            { label: '24 ч до визита', desc: 'Второе напоминание', color: 'text-amber-400' },
            { label: 'Утро дня визита', desc: '09:00 — финальное', color: 'text-red-400' },
          ].map(({ label, desc, color }) => (
            <div key={label} className="bg-charcoal rounded-xl p-3 border border-border-luxury text-center">
              <p className={cn('text-sm font-semibold', color)}>{label}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-luxury">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Записи ближайших 48 часов</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-champagne" /></div>
        ) : bookings.length === 0 ? (
          <div className="px-5 py-12 text-center text-text-tertiary text-sm">Нет предстоящих записей</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-5 py-3 text-xs text-text-tertiary font-medium">Время</th>
                  <th className="text-left px-4 py-3 text-xs text-text-tertiary font-medium">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs text-text-tertiary font-medium">Специалист</th>
                  <th className="text-left px-4 py-3 text-xs text-text-tertiary font-medium">Процедура</th>
                  <th className="text-left px-4 py-3 text-xs text-text-tertiary font-medium">Кабинет</th>
                  <th className="text-left px-4 py-3 text-xs text-text-tertiary font-medium">Окно</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-charcoal/50 transition-colors">
                    <td className="px-5 py-3 text-text-primary whitespace-nowrap font-mono text-xs">
                      {new Date(b.startAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{b.clientName}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{b.specialistName}</td>
                    <td className="px-4 py-3 text-text-tertiary text-xs max-w-[200px] truncate">{b.services}</td>
                    <td className="px-4 py-3 text-text-tertiary text-xs">{b.room || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', windowColor(b.window ?? '48ч'))}>
                        {b.window ?? '48ч'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CommunicationsPage() {
  const [tab, setTab] = React.useState<'overview' | 'history' | 'templates' | 'queue' | 'settings' | 'reminders'>('overview');
  const [analytics, setAnalytics] = React.useState<DeliveryStats | null>(null);
  const [queue, setQueue] = React.useState<QueueStatus | null>(null);
  const [history, setHistory] = React.useState<HistoryMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [days, setDays] = React.useState(30);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging/analytics?days=${days}`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: DeliveryStats };
      if (json.success && json.data) setAnalytics(json.data);
    } finally { setLoading(false); }
  }

  async function fetchQueue() {
    try {
      const res = await fetch('/api/messaging/queue', { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: QueueStatus };
      if (json.success && json.data) setQueue(json.data);
    } catch {}
  }

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging/history?days=${days}&limit=50`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: { messages: HistoryMessage[] } };
      if (json.success && json.data) setHistory(json.data.messages);
    } finally { setLoading(false); }
  }

  React.useEffect(() => {
    void fetchAnalytics();
    void fetchQueue();
  }, [days]);

  React.useEffect(() => {
    if (tab === 'history') void fetchHistory();
    if (tab === 'queue') void fetchQueue();
  }, [tab, days]);

  const Spinner = () => (
    <div className="flex items-center justify-center h-40">
      <RefreshCw className="w-6 h-6 text-champagne animate-spin" />
    </div>
  );

  const TABS = [
    { id: 'overview',   label: 'Обзор',        icon: BarChart2 },
    { id: 'history',    label: 'История',       icon: MessageSquare },
    { id: 'templates',  label: 'Шаблоны',       icon: Zap },
    { id: 'queue',      label: 'Очередь',       icon: Clock },
    { id: 'reminders',  label: 'Напоминания',   icon: Send },
    { id: 'settings',   label: 'Настройки',     icon: Settings },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-serif">Омниканальные коммуникации</h1>
          <p className="text-sm text-text-tertiary mt-0.5">WhatsApp · Telegram · MAX · Email — централизованный центр рассылок</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-obsidian/60 p-1 rounded-xl border border-border-luxury">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  days === d ? 'luxury-gradient text-obsidian' : 'text-text-tertiary hover:text-text-primary')}>
                {d}д
              </button>
            ))}
          </div>
          <button onClick={() => { void fetchAnalytics(); void fetchQueue(); }}
            className="p-2 rounded-lg border border-border-luxury text-text-tertiary hover:text-text-primary">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Channel status pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'WhatsApp', icon: Phone, color: 'border-green-500/30 bg-green-500/5 text-green-400' },
          { label: 'Telegram', icon: Bot, color: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
          { label: 'MAX', icon: MessageSquare, color: 'border-violet-500/30 bg-violet-500/5 text-violet-400' },
          { label: 'Email', icon: Mail, color: 'border-champagne/30 bg-champagne/5 text-champagne' },
        ].map(({ label, icon: Icon, color }) => (
          <button key={label} onClick={() => setTab('settings')}
            className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-80', color)}>
            <Icon className="w-3 h-3" />
            {label}
            <Settings className="w-2.5 h-2.5 opacity-60" />
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian/60 p-1 rounded-xl border border-border-luxury w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'luxury-gradient text-obsidian' : 'text-text-tertiary hover:text-text-primary hover:bg-charcoal')}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI row */}
          {loading && !analytics ? <Spinner /> : analytics ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Всего отправлено" value={analytics.summary.total} icon={Send} color="bg-champagne/20 text-champagne" />
                <StatCard label="Доставлено" value={analytics.summary.sent} sub={`${analytics.summary.deliveryRate}% успех`} icon={CheckCircle2} color="bg-emerald-500/20 text-emerald-400" />
                <StatCard label="Ошибки" value={analytics.summary.failed} icon={XCircle} color="bg-red-500/20 text-red-400" />
                <StatCard label="Период" value={`${analytics.summary.periodDays} дн.`} icon={TrendingUp} color="bg-blue-500/20 text-blue-400" />
              </div>

              {/* By channel */}
              <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border-luxury">
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">По каналам</h3>
                </div>
                <div className="divide-y divide-border-luxury">
                  {Object.entries(analytics.byChannel).map(([ch, stat]) => {
                    const Icon = CHANNEL_ICONS[ch.toUpperCase()] ?? MessageSquare;
                    const rate = stat.total > 0 ? Math.round((stat.sent / stat.total) * 100) : 0;
                    return (
                      <div key={ch} className="px-5 py-3.5 flex items-center gap-4">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-charcoal', CHANNEL_COLORS[ch.toUpperCase()] ?? '')}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-text-primary uppercase">{ch}</span>
                            <span className="text-text-secondary">{stat.sent}/{stat.total} ({rate}%)</span>
                          </div>
                          <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
                            <div className="h-full luxury-gradient rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-emerald-400">{stat.sent} ✓</div>
                          {stat.failed > 0 && <div className="text-red-400">{stat.failed} ✗</div>}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(analytics.byChannel).length === 0 && (
                    <div className="px-5 py-8 text-center text-text-tertiary text-sm">Нет данных за период</div>
                  )}
                </div>
              </div>

              {/* Recent failures */}
              {analytics.recentFailures.length > 0 && (
                <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border-luxury flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Последние ошибки доставки</h3>
                  </div>
                  <div className="divide-y divide-border-luxury">
                    {analytics.recentFailures.slice(0, 8).map((f) => (
                      <div key={f.id} className="px-5 py-3 flex items-center gap-4">
                        <ChannelBadge channel={f.channel} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">{f.user ? `${f.user.firstName} ${f.user.lastName}` : 'Неизвестно'}</p>
                          <p className="text-xs text-red-400 truncate">{f.errorMessage ?? 'Нет описания'}</p>
                        </div>
                        <div className="text-xs text-text-tertiary">{f.retryCount} попыток</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected users */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'WhatsApp подключено', val: analytics.preferences.whatsappEnabled, icon: Phone, color: 'text-green-400' },
                  { label: 'Telegram подключено', val: analytics.preferences.telegramEnabled, icon: Bot, color: 'text-blue-400' },
                  { label: 'MAX подключено', val: analytics.preferences.maxEnabled, icon: MessageSquare, color: 'text-violet-400' },
                  { label: 'Email включён', val: analytics.preferences.emailEnabled, icon: Mail, color: 'text-champagne' },
                ].map(({ label, val, icon: Icon, color }) => (
                  <div key={label} className="bg-onyx border border-border-luxury rounded-xl p-4 flex items-center gap-3">
                    <Icon className={cn('w-5 h-5', color)} />
                    <div>
                      <p className="text-lg font-bold text-text-primary">{val}</p>
                      <p className="text-xs text-text-tertiary">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-text-tertiary py-12 text-sm">Нет данных</div>
          )}

          {/* Send panel */}
          <SendPanel onSent={() => { void fetchAnalytics(); }} />
        </div>
      )}

      {/* ── HISTORY ────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => void fetchHistory()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-luxury text-text-tertiary text-sm hover:text-text-primary">
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>

          {loading ? <Spinner /> : (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Получатель</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Канал</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Шаблон</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Попыток</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury">
                    {history.map((msg) => (
                      <tr key={msg.id} className="hover:bg-charcoal/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-text-primary">
                            {msg.user ? `${msg.user.firstName} ${msg.user.lastName}` : '—'}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {msg.recipientPhone ?? msg.recipientChatId ?? msg.recipientEmail ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><ChannelBadge channel={msg.channel} /></td>
                        <td className="px-4 py-3.5 text-xs text-text-secondary">{msg.template?.key ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={msg.status} />
                          {msg.errorMessage && <p className="text-[10px] text-red-400 mt-0.5 max-w-[160px] truncate">{msg.errorMessage}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-text-tertiary">{msg.retryCount}</td>
                        <td className="px-4 py-3.5 text-xs text-text-tertiary">
                          {new Date(msg.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-text-tertiary text-sm">Нет сообщений</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES ──────────────────────────────────────────────────────── */}
      {tab === 'templates' && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.values(TEMPLATES).map((t) => (
            <div key={t.key} className="bg-onyx border border-border-luxury rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.nameRu}</p>
                  <p className="text-xs text-text-tertiary font-mono">{t.key}</p>
                </div>
                {t.whatsappTemplateName && (
                  <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    WA: {t.whatsappTemplateName}
                  </span>
                )}
              </div>
              <div className="bg-charcoal/50 rounded-xl p-3 space-y-2">
                {/* RU preview */}
                <div>
                  <p className="text-[10px] text-text-tertiary mb-1">🇷🇺 RU</p>
                  <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                    {(() => {
                      const body = t.bodyRu({ clientName: 'Анна Смирнова', specialistName: 'Ирина В.', serviceName: 'Тайский массаж', date: '1 июня', time: '14:00', room: 'Кабинет №2', salonName: 'Shante Lyur', amount: '3 500', currency: 'руб.' }).replace(/<[^>]+>/g, '');
                      return body.length > 200 ? body.slice(0, 200) + '…' : body;
                    })()}
                  </p>
                </div>
                {/* EN preview */}
                {t.bodyEn && (
                  <div className="border-t border-border-luxury/40 pt-2">
                    <p className="text-[10px] text-blue-400 mb-1">🇬🇧 EN</p>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                      {(() => {
                        const body = t.bodyEn!({ clientName: 'Anna S.', specialistName: 'Irina V.', serviceName: 'Thai Massage', date: 'June 1', time: '2:00 PM', room: 'Room 2', salonName: 'Shante Lyur', amount: '3 500', currency: 'rub.' }).replace(/<[^>]+>/g, '');
                        return body.length > 200 ? body.slice(0, 200) + '…' : body;
                      })()}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                {t.bodyEn && <span className="text-blue-400">🇬🇧 EN</span>}
                <span>🇷🇺 RU</span>
                <span className="ml-auto text-[10px] opacity-60">Переменные: serviceName, clientName, specialistName, date, time, room</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REMINDERS ──────────────────────────────────────────────────────── */}
      {tab === 'reminders' && <AutoRemindersPanel />}

      {/* ── SETTINGS ───────────────────────────────────────────────────────── */}
      {tab === 'settings' && <SettingsPanel />}

      {/* ── QUEUE ──────────────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div className="space-y-5">
          {queue ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Ожидают', value: queue.queue.waiting, icon: Clock, color: 'text-amber-400' },
                  { label: 'Активны', value: queue.queue.active, icon: Zap, color: 'text-blue-400' },
                  { label: 'Выполнено', value: queue.queue.completed, icon: CheckCircle2, color: 'text-emerald-400' },
                  { label: 'Ошибки', value: queue.queue.failed, icon: XCircle, color: 'text-red-400' },
                  { label: 'Отложены', value: queue.queue.delayed, icon: Clock, color: 'text-violet-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-onyx border border-border-luxury rounded-xl p-4 text-center">
                    <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
                    <p className="text-2xl font-bold text-text-primary font-serif">{value}</p>
                    <p className="text-xs text-text-tertiary">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => { await fetch('/api/messaging/queue?action=retry-failed', { method: 'DELETE', headers: authHeaders() }); void fetchQueue(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Повторить ошибки
                </button>
              </div>

              {Array.isArray(queue.recentFailed) && queue.recentFailed.length > 0 && (
                <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border-luxury">
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Последние ошибки очереди</h3>
                  </div>
                  <div className="p-5 text-xs text-text-secondary">
                    <pre className="overflow-x-auto">{JSON.stringify(queue.recentFailed.slice(0, 5), null, 2)}</pre>
                  </div>
                </div>
              )}
            </>
          ) : <Spinner />}
        </div>
      )}
    </div>
  );
}
