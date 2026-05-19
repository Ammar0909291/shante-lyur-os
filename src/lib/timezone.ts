const SALON_TZ = process.env.SALON_TIMEZONE ?? 'Europe/Moscow';

export function getSalonTz(): string {
  return SALON_TZ;
}

/**
 * Get the minute-of-day (0-1439) for a UTC Date in the salon's local timezone.
 * Use this instead of getHours()/getMinutes() to avoid UTC vs local time bugs.
 */
export function getLocalMinutes(utcDate: Date, tz = SALON_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);
  const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  // Intl can return hour=24 for midnight; normalize
  return (h % 24) * 60 + m;
}

/**
 * Get the day of week (MONDAY–SUNDAY) for a UTC Date in the salon's local timezone.
 * Use this instead of getDay() to handle late-evening bookings that cross midnight in UTC.
 */
export function getDayOfWeekInTz(utcDate: Date, tz = SALON_TZ): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
  }).formatToParts(utcDate);
  return parts.find(p => p.type === 'weekday')!.value.toUpperCase();
}

/**
 * Convert a local date string + time string to a UTC Date.
 * Example: localTimeToUtc('2026-05-19', '10:00', 'Europe/Moscow') → Date representing 07:00 UTC.
 */
export function localTimeToUtc(dateStr: string, timeStr: string, tz = SALON_TZ): Date {
  // Create a naive UTC instant from the date+time strings
  const naive = new Date(`${dateStr}T${timeStr}:00.000Z`);

  // What does the clock show in `tz` at this naive UTC instant?
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(naive);
  const lh = parseInt(parts.find(p => p.type === 'hour')!.value, 10) % 24;
  const lm = parseInt(parts.find(p => p.type === 'minute')!.value, 10);

  const [th, tm] = timeStr.split(':').map(Number);
  const diffMs = ((th * 60 + tm) - (lh * 60 + lm)) * 60_000;

  return new Date(naive.getTime() + diffMs);
}
