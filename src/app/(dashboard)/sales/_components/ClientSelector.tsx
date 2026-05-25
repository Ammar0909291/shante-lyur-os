'use client';

import * as React from 'react';
import { Search, X, UserPlus, Star, Clock, Hash } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ClientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  clientType: string;
  lastVisitAt: string | null;
  totalVisits: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  blacklisted: boolean;
}

export interface NewClientData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  sourceChannel: 'WALK_IN' | 'SOCIAL_MEDIA' | 'REFERRAL' | 'ONLINE_BOOKING' | 'OTHER';
}

interface Props {
  value: ClientSearchResult | null;
  onChange: (client: ClientSearchResult | null) => void;
  onNewClient?: (data: NewClientData) => void;
  disabled?: boolean;
  placeholder?: string;
  allowCreate?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all';

const CLIENT_TYPE_BADGE: Record<string, string> = {
  NEW:          'text-green-400 bg-green-400/10',
  RETURNING:    'text-blue-400 bg-blue-400/10',
  SUBSCRIPTION: 'text-champagne bg-champagne/10',
};
const CLIENT_TYPE_LABEL: Record<string, string> = {
  NEW: 'Новый', RETURNING: 'Постоянный', SUBSCRIPTION: 'Абонемент',
};

const SOURCE_OPTIONS = [
  { value: 'WALK_IN',        label: 'Walk-in' },
  { value: 'SOCIAL_MEDIA',   label: 'Соцсети' },
  { value: 'REFERRAL',       label: 'Рекомендация' },
  { value: 'ONLINE_BOOKING', label: 'Онлайн-запись' },
  { value: 'OTHER',          label: 'Другое' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7)  return `${diffDays} дн. назад`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)} нед. назад`;
  return `${Math.round(diffDays / 30)} мес. назад`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ClientSelector({
  value,
  onChange,
  onNewClient,
  disabled = false,
  placeholder = 'Поиск клиента по имени или телефону...',
  allowCreate = true,
}: Props) {
  const [query, setQuery]       = React.useState('');
  const [results, setResults]   = React.useState<ClientSearchResult[]>([]);
  const [open, setOpen]         = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [showNew, setShowNew]   = React.useState(false);

  // New client form state
  const [newFirst,  setNewFirst]  = React.useState('');
  const [newLast,   setNewLast]   = React.useState('');
  const [newPhone,  setNewPhone]  = React.useState('');
  const [newEmail,  setNewEmail]  = React.useState('');
  const [newSource, setNewSource] = React.useState<NewClientData['sourceChannel']>('WALK_IN');
  const [newError,  setNewError]  = React.useState('');
  const [creating,  setCreating]  = React.useState(false);

  const debounced = useDebounce(query, 300);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Search
  React.useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    fetch(`/api/v1/clients/search?q=${encodeURIComponent(debounced)}&limit=10`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { items: ClientSearchResult[] } }) => {
        if (json.success) setResults(json.data?.items ?? []);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [debounced]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function select(c: ClientSearchResult) {
    onChange(c);
    setQuery('');
    setResults([]);
    setOpen(false);
    setShowNew(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setShowNew(false);
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    setNewError('');
    if (!newFirst.trim()) { setNewError('Введите имя'); return; }
    if (!newLast.trim())  { setNewError('Введите фамилию'); return; }
    if (newPhone.trim().length < 5) { setNewError('Введите корректный телефон'); return; }
    setCreating(true);
    try {
      const res  = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: newFirst.trim(),
          lastName:  newLast.trim(),
          phone:     newPhone.trim(),
          email:     newEmail.trim() || undefined,
          sourceChannel: newSource,
        }),
      });
      const json = await res.json() as {
        success: boolean;
        data?: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
        error?: { message: string };
      };
      if (!json.success || !json.data) {
        setNewError(json.error?.message ?? 'Ошибка создания клиента');
        return;
      }
      const created: ClientSearchResult = {
        id:           json.data.id,
        firstName:    json.data.firstName,
        lastName:     json.data.lastName,
        fullName:     `${json.data.firstName} ${json.data.lastName}`,
        email:        json.data.email,
        phone:        json.data.phone,
        clientType:   'NEW',
        lastVisitAt:  null,
        totalVisits:  0,
        loyaltyPoints: 0,
        loyaltyTier:  'BRONZE',
        blacklisted:  false,
      };
      onNewClient?.({ firstName: newFirst, lastName: newLast, phone: newPhone, email: newEmail || undefined, sourceChannel: newSource });
      select(created);
    } catch {
      setNewError('Ошибка соединения');
    } finally {
      setCreating(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-champagne/30 bg-champagne/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-champagne/15 border border-champagne/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-champagne">
              {(value.firstName[0] ?? '') + (value.lastName[0] ?? '')}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{value.fullName}</p>
            <p className="text-xs text-text-tertiary">
              {value.phone ?? value.email}
              {value.lastVisitAt && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelative(value.lastVisitAt)}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CLIENT_TYPE_BADGE[value.clientType] ?? CLIENT_TYPE_BADGE.RETURNING}`}>
            {CLIENT_TYPE_LABEL[value.clientType] ?? value.clientType}
          </span>
          {value.totalVisits > 0 && (
            <span className="text-[10px] text-text-tertiary tabular-nums">
              {value.totalVisits} визит.
            </span>
          )}
          {!disabled && (
            <button type="button" onClick={clear} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-champagne/40 border-t-champagne rounded-full animate-spin pointer-events-none" />
        )}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputCls} pl-9 pr-9`}
          autoComplete="off"
        />
      </div>

      {open && (query.trim().length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-obsidian border border-border-luxury rounded-xl shadow-2xl z-30 overflow-hidden max-h-72 overflow-y-auto">

          {allowCreate && (
            <button
              type="button"
              onMouseDown={() => { setOpen(false); setShowNew(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-champagne/10 transition-colors border-b border-border-luxury"
            >
              <UserPlus className="w-4 h-4 text-champagne shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-champagne">Первый визит клиента</p>
                <p className="text-xs text-text-tertiary">Создать нового клиента</p>
              </div>
            </button>
          )}

          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => select(c)}
              className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-charcoal transition-colors ${c.blacklisted ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-text-secondary">
                    {(c.firstName[0] ?? '') + (c.lastName[0] ?? '')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {c.firstName} {c.lastName}
                    {c.blacklisted && <span className="ml-1.5 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">ЧС</span>}
                  </p>
                  <p className="text-xs text-text-tertiary flex items-center gap-2">
                    {c.phone && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{c.phone}</span>}
                    {c.lastVisitAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(c.lastVisitAt)}</span>}
                    {c.totalVisits > 0 && <span>{c.totalVisits} визит.</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {c.loyaltyPoints > 0 && (
                  <span className="text-[10px] text-champagne flex items-center gap-0.5">
                    <Star className="w-3 h-3" />{c.loyaltyPoints}
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CLIENT_TYPE_BADGE[c.clientType] ?? CLIENT_TYPE_BADGE.RETURNING}`}>
                  {CLIENT_TYPE_LABEL[c.clientType] ?? c.clientType}
                </span>
              </div>
            </button>
          ))}

          {results.length === 0 && query.trim().length >= 2 && !searching && (
            <p className="text-sm text-text-tertiary px-4 py-3">Клиент не найден</p>
          )}
        </div>
      )}

      {showNew && (
        <div className="mt-3 rounded-xl border border-champagne/20 bg-charcoal/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-champagne uppercase tracking-wider">Новый клиент</p>
            <button type="button" onClick={() => setShowNew(false)} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {newError && (
            <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{newError}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-muted mb-1">Имя *</label>
              <input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="Имя" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Фамилия *</label>
              <input value={newLast} onChange={(e) => setNewLast(e.target.value)} placeholder="Фамилия" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Телефон *</label>
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+7 999 000-00-00" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Email</label>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" type="email" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Источник</label>
            <select
              value={newSource}
              onChange={(e) => setNewSource(e.target.value as NewClientData['sourceChannel'])}
              className={`${inputCls} [&>option]:bg-obsidian [&>option]:text-text-primary`}
            >
              {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="flex-1 px-3 py-2 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={(e) => void handleCreateNew(e)}
              disabled={creating}
              className="flex-1 px-3 py-2 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50"
            >
              {creating ? 'Создание...' : 'Создать и выбрать'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
