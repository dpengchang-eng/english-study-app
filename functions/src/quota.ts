import { ANON_DAILY_QUOTA, LINKED_DAILY_QUOTA, SEOUL_TZ } from "./types";

export function seoulDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function dailyLimit(linked: boolean): number {
  return linked ? LINKED_DAILY_QUOTA : ANON_DAILY_QUOTA;
}

export function nextQuota(
  current: { convertCountToday?: number; convertDayKey?: string } | undefined,
  now = new Date()
): { convertCountToday: number; convertDayKey: string; remainingBeforeInc: number } {
  const dayKey = seoulDayKey(now);
  const sameDay = current?.convertDayKey === dayKey;
  const convertCountToday = sameDay ? Number(current?.convertCountToday ?? 0) : 0;
  return {
    convertCountToday,
    convertDayKey: dayKey,
    remainingBeforeInc: convertCountToday
  };
}
