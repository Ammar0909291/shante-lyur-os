'use client';

import React from 'react';
import Link from 'next/link';
import { X, Phone, Mail, Star, Calendar, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientSummaryResponse } from '@/modules/crm/domain/client.dto';

// ─── Slide-over sheet ─────────────────────────────────────────────────────────

interface ClientProfileSheetProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ClientSummaryResponse };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function tierColor(tier: string | null) {
  switch (tier?.toUpperCase()) {
    case 'PLATINUM': return 'text-blue-300 bg-blue-900/30';
    case 'GOLD':     return 'text-amber-300 bg-amber-900/30';
    case 'SILVER':   return 'text-slate-300 bg-slate-700/40';
    default:         return 'text-stone-400 bg-stone-800/40';
  }
}

export function ClientProfileSheet({ clientId, open, onClose }: ClientProfileSheetProps) {
  const [state, setState] = React.useState<LoadState>({ status: 'idle' });

  React.useEffect(() => {
    if (!open || !clientId) return;

    setState({ status: 'loading' });
    fetch(`/api/v1/clients/${clientId}/summary`)
      .then(async (res) => {
        const json = await res.json() as { success: boolean; data?: ClientSummaryResponse; error?: { message: string } };
        if (!json.success || !json.data) {
          setState({ status: 'error', message: json.error?.message ?? 'Failed to load' });
        } else {
          setState({ status: 'ok', data: json.data });
        }
      })
      .catch((e: unknown) => {
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Network error' });
      });
  }, [open, clientId]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-obsidian/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md',
          'bg-onyx border-l border-border-luxury shadow-2xl',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-300',
        )}
        aria-label="Client profile panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-luxury">
          <span className="text-sm font-semibold text-champagne">Профиль клиента</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-champagne hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {state.status === 'loading' && (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center gap-2 h-40 justify-center text-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-muted">{state.message}</p>
            </div>
          )}

          {state.status === 'ok' && <SheetContent data={state.data} />}
        </div>

        {/* Footer — open full profile */}
        <div className="px-5 py-4 border-t border-border-luxury">
          <Link
            href={`/clients/${clientId}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-champagne/10 hover:bg-champagne/20 text-champagne text-sm font-medium transition-colors border border-champagne/20"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть полный профиль
          </Link>
        </div>
      </aside>
    </>
  );
}

// ─── Sheet content ────────────────────────────────────────────────────────────

function SheetContent({ data }: { data: ClientSummaryResponse }) {
  const fullName = `${data.firstName} ${data.lastName}`;
  const initials = `${data.firstName[0] ?? ''}${data.lastName[0] ?? ''}`.toUpperCase();

  return (
    <>
      {/* Identity */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-champagne/30 to-champagne/10 flex items-center justify-center text-champagne font-bold text-lg shrink-0">
          {data.avatarUrl
            ? <img src={data.avatarUrl} alt={fullName} className="w-14 h-14 rounded-full object-cover" />
            : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-pearl truncate">{fullName}</h2>
            {data.isBlacklisted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800/40">
                Чёрный список
              </span>
            )}
          </div>
          {data.loyaltyTier && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', tierColor(data.loyaltyTier))}>
              {data.loyaltyTier}
            </span>
          )}
          <div className="mt-1 space-y-0.5">
            {data.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Phone className="w-3 h-3" />
                <span>{data.phone}</span>
              </div>
            )}
            {data.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Mail className="w-3 h-3" />
                <span className="truncate">{data.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Визитов', value: data.totalVisits, icon: <Calendar className="w-3.5 h-3.5" /> },
          { label: 'Потрачено', value: formatCurrency(data.totalSpent), icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { label: 'Баллы', value: data.loyaltyPoints, icon: <Star className="w-3.5 h-3.5" /> },
        ].map((s) => (
          <div key={s.label} className="bg-obsidian rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-champagne/60 mb-1">{s.icon}</div>
            <div className="text-sm font-bold text-pearl">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted"
              style={t.color ? { borderColor: t.color + '55', color: t.color } : undefined}
            >
              {t.tag}
            </span>
          ))}
        </div>
      )}

      {/* Next booking */}
      {data.nextBooking && (
        <div>
          <h3 className="text-xs font-semibold text-champagne/70 uppercase tracking-wider mb-2">Ближайшая запись</h3>
          <div className="bg-obsidian rounded-xl p-3 space-y-1">
            <div className="text-sm text-pearl font-medium">{data.nextBooking.serviceName}</div>
            <div className="text-xs text-muted">{data.nextBooking.specialistName}</div>
            <div className="text-xs text-muted">{formatDate(data.nextBooking.startAt)}</div>
            <div className="text-xs text-champagne">{formatCurrency(data.nextBooking.totalPrice)}</div>
          </div>
        </div>
      )}

      {/* Recent visits */}
      {data.recentVisits.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-champagne/70 uppercase tracking-wider mb-2">Последние визиты</h3>
          <div className="space-y-2">
            {data.recentVisits.map((v) => (
              <div key={v.id} className="bg-obsidian rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-pearl truncate">{v.serviceName}</div>
                  <div className="text-xs text-muted">{v.specialistName} · {formatDate(v.startAt)}</div>
                </div>
                <div className="text-xs text-champagne shrink-0">{formatCurrency(v.totalPrice)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

