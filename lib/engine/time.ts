import type { Species } from './types';

function parseDate(value: string): Date | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time);
}

function dayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

// 按本地日历日比较，避免“昨天 23:59 → 今天 00:01”被算成 0 天
export function daysSince(iso: string, now: Date = new Date()): number | null {
  const date = parseDate(iso);
  if (!date) return null;
  return Math.max(0, dayNumber(now) - dayNumber(date));
}

export function recencyLabel(iso: string, now: Date = new Date()): string | null {
  const days = daysSince(iso, now);
  if (days === null) return null;
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return days + ' 天前';
}

// 记录不保证有序，取该物种时间最新的一条；其它物种忽略
export function latestRecency(
  records: Array<{ species: Species; testedAt: string }>,
  species: Species,
  now: Date = new Date(),
): string | null {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const record of records) {
    if (record.species !== species) continue;
    const time = Date.parse(record.testedAt);
    if (Number.isNaN(time) || time <= latestTime) continue;
    latestTime = time;
    latest = record.testedAt;
  }
  return latest === null ? null : recencyLabel(latest, now);
}
