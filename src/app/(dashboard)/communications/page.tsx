'use client';

import * as React from 'react';
import {
  Send, MessageSquare, Phone, Bot, Mail,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, BarChart2, Settings, Zap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMPLATES } from '@/lib/communication/templates/definitions';

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

function authHeaders(): Record<string, string> {
  try {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (!match) return { 'x-user-id': 'system', 'x-user-role': 'ADMIN' };
    const payload = JSON.parse(atob(match[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; role?: string };
    return { 'x-user-id': payload.sub ?? 'system', 'x-user-role': payload.role ?? 'ADMIN' };
  } catch { return { 'x-user-id': 'system', 'x-user-role': 'ADMIN' }; }
}

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
  // Default sample vars — no hardcoded service names; user fills them with real data before sending
  const [vars, setVars] = React.useState({
    clientName: 'Анна Смирнова',
    specialistName: 'Ирина Владимирова',
    serviceName: '',
    date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    time: '14:00',
    room: '',
    department: '',
    amount: '',
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
              <option value="email">Email</option>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CommunicationsPage() {
  const [tab, setTab] = React.useState<'overview' | 'history' | 'templates' | 'queue'>('overview');
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
    { id: 'overview', label: 'Обзор', icon: BarChart2 },
    { id: 'history', label: 'История', icon: MessageSquare },
    { id: 'templates', label: 'Шаблоны', icon: Settings },
    { id: 'queue', label: 'Очередь', icon: Clock },
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
          { label: 'WhatsApp', env: 'WHATSAPP_ACCESS_TOKEN', icon: Phone, color: 'border-green-500/30 bg-green-500/5 text-green-400' },
          { label: 'Telegram', env: 'TELEGRAM_BOT_TOKEN', icon: Bot, color: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
          { label: 'MAX', env: 'MAX_BOT_TOKEN', icon: MessageSquare, color: 'border-violet-500/30 bg-violet-500/5 text-violet-400' },
          { label: 'Email', env: 'SMTP_HOST', icon: Mail, color: 'border-champagne/30 bg-champagne/5 text-champagne' },
        ].map(({ label, icon: Icon, color }) => (
          <div key={label} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium', color)}>
            <Icon className="w-3 h-3" />
            {label}
            <span className="text-[10px] opacity-70">настройте через env</span>
          </div>
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
                      const body = t.bodyRu({ clientName: 'Анна Смирнова', specialistName: 'Ирина В.', serviceName: '{{услуга}}', date: '1 июня', time: '14:00', salonName: 'Shante Lyur' }).replace(/<[^>]+>/g, '');
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
                        const body = t.bodyEn!({ clientName: 'Anna S.', specialistName: 'Irina V.', serviceName: '{{service}}', date: 'June 1', time: '2:00 PM', salonName: 'Shante Lyur' }).replace(/<[^>]+>/g, '');
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
