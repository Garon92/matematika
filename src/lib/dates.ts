/** Local-day helpers. A "day" is an integer count of local days since 1970-01-01. */
export function dayIndex(d: Date = new Date()): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);
}

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date for a day index (local noon, to be DST-safe). */
export function dateOfDay(idx: number): Date {
  const utc = new Date(idx * 86_400_000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12);
}

export function dayKeyOf(idx: number): string {
  return dayKey(dateOfDay(idx));
}

const WEEKDAYS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
export function weekdayShort(idx: number): string {
  return WEEKDAYS[dateOfDay(idx).getDay()]!;
}
