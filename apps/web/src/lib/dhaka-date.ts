import type { Lang } from '@/types/api';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayInDhaka(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isValidDay(s: string): boolean {
  if (!DAY_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }
  return s <= todayInDhaka();
}

export function parseDayString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** First calendar day of the month after `year`/`monthIndex` (0-based). */
export function firstDayOfNextMonth(year: number, monthIndex: number): string {
  const next =
    monthIndex === 11
      ? new Date(year + 1, 0, 1)
      : new Date(year, monthIndex + 1, 1);
  return toDayString(next);
}

export function formatDayLabel(s: string, lang: Lang): string {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (lang === 'bn') {
    return new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dt);
  }
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}
