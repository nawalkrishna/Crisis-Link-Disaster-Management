import type { Priority } from '@crisislink/shared';

/** 'FIRST_AID' -> 'First aid', 'BUILDING_COLLAPSE' -> 'Building collapse' */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const numberFormat = new Intl.NumberFormat('en-IN');
export const formatNumber = (n: number) => numberFormat.format(n);

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
/** "5 minutes ago", "yesterday" - easier to scan in a crisis than timestamps. */
export function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const priorityTone: Record<Priority, Tone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

/** One mapping for every status enum, so the same word always has the same colour. */
const STATUS_TONES: Record<string, Tone> = {
  OPEN: 'info',
  ACTIVE: 'success',
  RECEIVED: 'success',
  DONE: 'success',
  FULFILLED: 'success',
  RESOLVED: 'success',
  FULL: 'warning',
  PENDING: 'warning',
  PLEDGED: 'warning',
  ASSIGNED: 'warning',
  IN_PROGRESS: 'warning',
  REPORTED: 'warning',
  VERIFIED: 'danger', // a confirmed, still-active incident
  SUSPENDED: 'danger',
  SENT: 'success',
  QUEUED: 'info',
  SENDING: 'info',
  FAILED: 'danger',
};
export const statusTone = (status: string): Tone => STATUS_TONES[status] ?? 'neutral';

export const pluralize = (count: number, word: string, plural = `${word}s`) =>
  `${formatNumber(count)} ${count === 1 ? word : plural}`;
