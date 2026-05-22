/**
 * Shared time and math utilities for analytics dashboard endpoints.
 */

// TODO: Set TIMEZONE env var for non-Moscow salons
export const SALON_TIMEZONE = process.env.TIMEZONE ?? 'Europe/Moscow';

/**
 * Returns the UTC start and end of "today" in the given IANA timezone.
 * Uses noon-based offset to avoid DST boundary ambiguity.
 */
export function getTodayBounds(timezone: string): { todayStart: Date; todayEnd: Date } {
  const now = new Date();
  const localDateStr = now.toLocaleDateString('sv-SE', { timeZone: timezone }); // "YYYY-MM-DD"
  const noonUtc = new Date(localDateStr + 'T12:00:00Z');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(noonUtc);
  const lh = Number(parts.find(p => p.type === 'hour')?.value ?? '12');
  const lm = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  const offsetMs = (lh * 60 + lm - 12 * 60) * 60000;
  const todayStart = new Date(new Date(localDateStr + 'T00:00:00Z').getTime() - offsetMs);
  return { todayStart, todayEnd: new Date(todayStart.getTime() + 86_400_000) };
}

/**
 * Returns UTC start/end for any given YYYY-MM-DD date string in the salon timezone.
 * Uses the same noon-based offset trick as getTodayBounds to avoid DST ambiguity.
 */
export function getDateBounds(
  dateStr: string,
  timezone: string,
): { start: Date; end: Date } {
  const noonUtc = new Date(dateStr + 'T12:00:00Z');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(noonUtc);
  const lh = Number(parts.find(p => p.type === 'hour')?.value ?? '12');
  const lm = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  const offsetMs = (lh * 60 + lm - 12 * 60) * 60000;
  const start = new Date(new Date(dateStr + 'T00:00:00Z').getTime() - offsetMs);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

/**
 * Returns Monday 00:00 (UTC-adjusted for timezone) of the week containing todayStart.
 */
export function getWeekStart(timezone: string, todayStart: Date): Date {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' });
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dow = weekdays.indexOf(dayName); // 0=Sun … 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return new Date(todayStart.getTime() - daysFromMonday * 86_400_000);
}

/** Percentage change: (current - previous) / previous * 100, rounded. Returns 0 when previous is 0. */
export function pct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function ok<T>(data: T) {
  return Response.json({ success: true, data });
}

export function apiError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'] as const;

export function checkAuth(
  userId: string | null,
  role: string,
): Response | null {
  if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }
  return null;
}
