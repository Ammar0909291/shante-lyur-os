'use client';

import React from 'react';
import { Send, Users, Tag, Clock, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentKind = 'ALL' | 'LOYALTY_TIER' | 'TAG' | 'INACTIVE_DAYS';
type MsgType = 'SYSTEM' | 'PROMO_CODE' | 'APPOINTMENT_REMINDER' | 'WELCOME';

interface SegmentConfig {
  kind:  SegmentKind;
  tier?: string;
  tag?:  string;
  days?: number;
}

interface SendResult {
  sent:    number;
  message?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LOYALTY_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];

const MSG_TYPES: { value: MsgType; label: string }[] = [
  { value: 'SYSTEM',                label: 'Системное'     },
  { value: 'PROMO_CODE',            label: 'Акция/Промо'   },
  { value: 'APPOINTMENT_REMINDER',  label: 'Напоминание'   },
  { value: 'WELCOME',               label: 'Приветствие'   },
];

const SEGMENT_OPTIONS: { kind: SegmentKind; label: string; icon: React.ElementType; desc: string }[] = [
  { kind: 'ALL',           label: 'Все клиенты',    icon: Users,   desc: 'Отправить всем зарегистрированным клиентам' },
  { kind: 'LOYALTY_TIER',  label: 'По уровню',      icon: CheckCircle2, desc: 'Клиенты с определённым уровнем лояльности' },
  { kind: 'TAG',           label: 'По тегу',        icon: Tag,     desc: 'Клиенты с определённым тегом' },
  { kind: 'INACTIVE_DAYS', label: 'Неактивные',     icon: Clock,   desc: 'Клиенты, не посещавшие N дней' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreviewUrl(seg: SegmentConfig): string {
  const qs = new URLSearchParams({ segment: seg.kind });
  if (seg.kind === 'LOYALTY_TIER' && seg.tier) qs.set('tier', seg.tier);
  if (seg.kind === 'TAG'          && seg.tag)  qs.set('tag', seg.tag);
  if (seg.kind === 'INACTIVE_DAYS' && seg.days) qs.set('days', String(seg.days));
  return `/api/v1/communication/send?${qs}`;
}

function buildPayload(seg: SegmentConfig, title: string, body: string, type: MsgType) {
  const segment: Record<string, unknown> = { kind: seg.kind };
  if (seg.kind === 'LOYALTY_TIER') segment.tier = seg.tier ?? '';
  if (seg.kind === 'TAG')          segment.tag  = seg.tag  ?? '';
  if (seg.kind === 'INACTIVE_DAYS') segment.days = seg.days ?? 30;
  return { title, body, type, segment };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunicationPage() {
  const [segment, setSegment]   = React.useState<SegmentConfig>({ kind: 'ALL' });
  const [msgType, setMsgType]   = React.useState<MsgType>('SYSTEM');
  const [title,   setTitle]     = React.useState('');
  const [body,    setBody]       = React.useState('');
  const [count,   setCount]     = React.useState<number | null>(null);
  const [previewing, setPrev]   = React.useState(false);
  const [sending,    setSend]   = React.useState(false);
  const [result,     setResult] = React.useState<SendResult | null>(null);
  const [error,      setError]  = React.useState('');

  // Debounced segment preview
  React.useEffect(() => {
    setCount(null);
    const ready =
      segment.kind === 'ALL' ||
      (segment.kind === 'LOYALTY_TIER' && !!segment.tier) ||
      (segment.kind === 'TAG' && !!segment.tag) ||
      (segment.kind === 'INACTIVE_DAYS' && !!segment.days && segment.days > 0);
    if (!ready) return;

    setPrev(true);
    const t = setTimeout(() => {
      fetch(buildPreviewUrl(segment))
        .then((r) => r.json())
        .then((j) => { if (j.success) setCount(j.data.count as number); })
        .catch(() => {})
        .finally(() => setPrev(false));
    }, 400);
    return () => { clearTimeout(t); setPrev(false); };
  }, [segment]);

  function handleSegmentKind(kind: SegmentKind) {
    setSegment({ kind });
    setResult(null);
    setError('');
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!title.trim() || !body.trim()) { setError('Заполните заголовок и текст'); return; }
    if (count === 0) { setError('Нет получателей в этом сегменте'); return; }

    setSend(true);
    try {
      const res  = await fetch('/api/v1/communication/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload(segment, title.trim(), body.trim(), msgType)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка отправки');
      } else {
        setResult(json.data as SendResult);
        setTitle('');
        setBody('');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSend(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Рассылка сообщений</h1>
          <p className="text-sm text-text-muted mt-0.5">Отправка in-app уведомлений выбранному сегменту клиентов</p>
        </div>

        <form onSubmit={handleSend} className="space-y-5">

          {/* Segment selector */}
          <div className="bg-charcoal border border-border-luxury rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium text-text-secondary">Сегмент получателей</p>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENT_OPTIONS.map(({ kind, label, icon: Icon, desc }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleSegmentKind(kind)}
                  className={cn(
                    'text-left rounded-xl border px-3 py-3 transition-all',
                    segment.kind === kind
                      ? 'border-champagne/50 bg-champagne/8 text-text-primary'
                      : 'border-border-luxury bg-obsidian/40 text-text-secondary hover:border-border-light',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('w-4 h-4', segment.kind === kind ? 'text-champagne' : 'text-text-tertiary')} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">{desc}</p>
                </button>
              ))}
            </div>

            {/* Segment sub-options */}
            {segment.kind === 'LOYALTY_TIER' && (
              <div className="pt-1">
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Уровень лояльности</label>
                <div className="flex flex-wrap gap-1.5">
                  {LOYALTY_TIERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSegment({ kind: 'LOYALTY_TIER', tier: t })}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                        segment.tier === t
                          ? 'border-champagne/50 bg-champagne/10 text-champagne'
                          : 'border-border-luxury text-text-muted hover:text-text-secondary',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {segment.kind === 'TAG' && (
              <div className="pt-1">
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Тег клиента</label>
                <input
                  type="text"
                  value={segment.tag ?? ''}
                  onChange={(e) => setSegment({ kind: 'TAG', tag: e.target.value })}
                  placeholder="Например: VIP, new, pregnant…"
                  className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
                />
              </div>
            )}

            {segment.kind === 'INACTIVE_DAYS' && (
              <div className="pt-1">
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Неактивны более (дней)</label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={segment.days ?? 30}
                  onChange={(e) => setSegment({ kind: 'INACTIVE_DAYS', days: parseInt(e.target.value, 10) || 30 })}
                  className="w-32 rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                />
              </div>
            )}

            {/* Recipient count */}
            <div className="flex items-center gap-2 pt-1">
              {previewing ? (
                <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin" />
              ) : (
                <Users className="w-3.5 h-3.5 text-text-muted" />
              )}
              <span className="text-xs text-text-muted">
                {count === null ? 'Вычисление…' : `${count} получател${count === 1 ? 'ь' : count < 5 ? 'я' : 'ей'}`}
              </span>
            </div>
          </div>

          {/* Message type */}
          <div className="bg-charcoal border border-border-luxury rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium text-text-secondary">Тип сообщения</p>
            <div className="flex flex-wrap gap-1.5">
              {MSG_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMsgType(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    msgType === value
                      ? 'border-champagne/50 bg-champagne/10 text-champagne'
                      : 'border-border-luxury text-text-muted hover:text-text-secondary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Message content */}
          <div className="bg-charcoal border border-border-luxury rounded-2xl p-4 space-y-4">
            <p className="text-sm font-medium text-text-secondary">Содержание</p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Заголовок</label>
              <input
                type="text"
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Заголовок уведомления"
                required
                className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
              <p className="text-[11px] text-text-muted text-right">{title.length}/255</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Текст сообщения</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Текст уведомления для клиентов…"
                required
                className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40 resize-none"
              />
              <p className="text-[11px] text-text-muted text-right">{body.length}/4000</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400">
                {result.sent > 0
                  ? `Отправлено ${result.sent} получател${result.sent === 1 ? 'ю' : result.sent < 5 ? 'ям' : 'ям'}`
                  : (result.message ?? 'Нет получателей')}
              </p>
            </div>
          )}

          {/* Send button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || count === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                'bg-champagne text-obsidian hover:bg-champagne/90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Отправка…' : `Отправить${count !== null && count > 0 ? ` (${count})` : ''}`}
            </button>
          </div>

        </form>

        {/* Info block */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-charcoal/60 border border-border-luxury text-xs text-text-muted">
          <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-text-tertiary" />
          <p>Сообщения доставляются как in-app уведомления и отображаются в центре уведомлений каждого клиента.</p>
        </div>

      </div>
    </div>
  );
}
