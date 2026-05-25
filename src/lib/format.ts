/**
 * Shared formatting utilities — single source of truth for all display formatting
 * in the application. Import from here, never inline Intl constructors.
 */

// ── Currency ─────────────────────────────────────────────────────────────────

/** ₽ 12,500 — no decimals for whole numbers, ₽ 12,500.50 when cents present */
export function formatCurrency(amount: number | string, currency = 'RUB'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '₽ 0';
  const hasDecimals = Math.abs(n - Math.round(n)) > 0.005;
  return new Intl.NumberFormat('ru-RU', {
    style:                 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(n);
}

/** Abbreviated: 1.2K / 12.5K / 1.2M — for KPI cards and charts */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) return `₽ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `₽ ${(amount / 1_000).toFixed(1)}K`;
  return `₽ ${Math.round(amount)}`;
}

// ── Numbers ──────────────────────────────────────────────────────────────────

/** 1,234 comma-separated */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

/** 12.5% (one decimal max) */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Duration in minutes → "1 ч 30 мин" or "45 мин" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** "25 мая 2026" */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date));
}

/** "25.05.2026" */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

/** "14:30" */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

/** "25 мая 2026, 14:30" */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

/** "3 дня назад" / "Сегодня" / "Вчера" */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d     = new Date(date);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs  = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0)  return 'Сегодня';
  if (diffDays === 1)  return 'Вчера';
  if (diffDays === 2)  return '2 дня назад';
  if (diffDays < 7)   return `${diffDays} дней назад`;
  if (diffDays < 14)  return 'Неделю назад';
  if (diffDays < 30)  return `${Math.round(diffDays / 7)} нед. назад`;
  if (diffDays < 60)  return 'Месяц назад';
  if (diffDays < 365) return `${Math.round(diffDays / 30)} мес. назад`;
  return `${Math.round(diffDays / 365)} г. назад`;
}

/** "май 2026" */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long', year: 'numeric',
  }).format(new Date(date));
}

// ── Misc ─────────────────────────────────────────────────────────────────────

/** Initials from full name: "Анна Иванова" → "АИ" */
export function getInitials(name: string, maxChars = 2): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, maxChars)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Stable display reference: "CL-A3F1" from UUID */
export function formatClientRef(uuid: string): string {
  return 'CL-' + uuid.replace(/-/g, '').substring(0, 8).toUpperCase();
}
