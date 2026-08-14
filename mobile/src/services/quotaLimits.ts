export const ANON_DAILY_QUOTA = 20;
export const LINKED_DAILY_QUOTA = 80;
export const SEOUL_TZ = "Asia/Seoul";

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

export function remainingToday(used: number, linked: boolean): number {
  return Math.max(0, dailyLimit(linked) - Math.max(0, used));
}

/** Same source of truth for check and increment. Clearing local storage cannot undercount. */
export function mergeQuotaCounts(localUsed: number, remoteUsed: number): number {
  return Math.max(Math.max(0, localUsed), Math.max(0, remoteUsed));
}

/** @deprecated Use remainingToday(used, false) */
export function remainingAnon(used: number): number {
  return remainingToday(used, false);
}
