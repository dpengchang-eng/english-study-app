import { seoulDayKey } from "./quotaLimits";
import type { WordbookItem } from "../types";

export { seoulDayKey } from "./quotaLimits";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function dayKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

/** Seoul 00:00 as a UTC millisecond timestamp. Asia/Seoul is UTC+9, no DST. */
export function seoulDayStartMs(now: number): number {
  const { year, month, day } = parseDayKey(seoulDayKey(new Date(now)));
  return Date.UTC(year, month - 1, day) - SEOUL_OFFSET_MS;
}

/**
 * Calendar day for an item. dueAt before today 00:00 Seoul counts as today.
 * Does not rewrite dueAt.
 */
export function calendarDayKey(dueAt: number, now: number): string {
  const today = seoulDayKey(new Date(now));
  if (dueAt < seoulDayStartMs(now)) return today;
  return seoulDayKey(new Date(dueAt));
}

export function itemsOnCalendarDay(items: WordbookItem[], dayKey: string, now: number): WordbookItem[] {
  return items.filter((item) => calendarDayKey(item.dueAt, now) === dayKey).sort((a, b) => a.dueAt - b.dueAt);
}

/** Days that should show a dot. Overdue dots land on today. */
export function dottedDayKeys(items: WordbookItem[], now: number): Set<string> {
  return new Set(items.map((item) => calendarDayKey(item.dueAt, now)));
}

/** Today's count including overdue. Does not change dueAt. */
export function todayReviewCount(items: WordbookItem[], now: number): number {
  return itemsOnCalendarDay(items, seoulDayKey(new Date(now)), now).length;
}

export function diffSeoulDays(fromKey: string, toKey: string): number {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  return Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY_MS);
}

/** Muted row label: 今天 / 3 天后 / 8月18日 */
export function dueLabel(dueAt: number, now: number): string {
  const today = seoulDayKey(new Date(now));
  const day = calendarDayKey(dueAt, now);
  if (day === today) return "今天";
  const diff = diffSeoulDays(today, day);
  if (diff >= 1 && diff <= 7) return `${diff} 天后`;
  const { month, day: date } = parseDayKey(day);
  return `${month}月${date}日`;
}

export function seoulWeekday(dayKey: string): number {
  const { year, month, day } = parseDayKey(dayKey);
  const noonUtc = Date.UTC(year, month - 1, day, 3, 0, 0);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(noonUtc));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

export function yearMonthOf(now: number): { year: number; month: number } {
  return parseDayKey(seoulDayKey(new Date(now)));
}

export type MonthCell = { dayKey: string; day: number } | null;

export function monthCells(year: number, month: number): MonthCell[] {
  const first = dayKeyFromParts(year, month, 1);
  const lead = seoulWeekday(first);
  const cells: MonthCell[] = Array.from({ length: lead }, () => null);
  const last = daysInMonth(year, month);
  for (let day = 1; day <= last; day += 1) {
    cells.push({ dayKey: dayKeyFromParts(year, month, day), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Practice only the given list, in dueAt order. Does not re-query due items. */
export function practiceSourceItems(items: WordbookItem[]): WordbookItem[] {
  return [...items].sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * Review tab stays mounted. If the selected day is yesterday or earlier,
 * snap to today so overdue items are not stuck on an empty past day.
 * A future day the user picked stays.
 */
export function snapSelectedDayToToday(selectedDay: string, now: number): string {
  const today = seoulDayKey(new Date(now));
  return selectedDay < today ? today : selectedDay;
}

/**
 * After a Seoul month rollover the grid can still show last month.
 * Past months snap to the current month. A future month the user opened stays.
 */
export function snapDisplayedMonth(year: number, month: number, now: number): { year: number; month: number } {
  const current = yearMonthOf(now);
  if (year < current.year || (year === current.year && month < current.month)) {
    return { year: current.year, month: current.month };
  }
  return { year, month };
}

/** Use the passed ids when set. Does not re-query due-now. */
export function pickClozeItems(items: WordbookItem[], itemIds?: readonly string[]): WordbookItem[] {
  if (itemIds?.length) {
    const want = new Set(itemIds);
    return items.filter((item) => want.has(item.id));
  }
  return items.filter((item) => item.dueAt <= Date.now());
}

/** Wordbook starts as [] then hydrates. Do not build an empty cloze yet. */
export function waitForClozeHydrate(itemIds: readonly string[] | undefined, items: WordbookItem[]): boolean {
  return Boolean(itemIds?.length && items.length === 0);
}

/**
 * Rebuild when itemIds were set, the first pick was empty, and items later
 * contain those ids. Does not mean "query due now".
 */
export function shouldRetryClozeHydrate(
  itemIds: readonly string[] | undefined,
  items: WordbookItem[],
  session: { cards: readonly unknown[] } | null
): boolean {
  if (!itemIds?.length) return false;
  if (session === null || session.cards.length > 0) return false;
  return pickClozeItems(items, itemIds).length > 0;
}

/** Effect key: pending while [], then the matched ids so a later hydrate retries. */
export function clozeHydrateKey(itemIds: readonly string[] | undefined, items: WordbookItem[]): string {
  if (!itemIds?.length) return "noids";
  if (waitForClozeHydrate(itemIds, items)) return "pending";
  return `ready:${pickClozeItems(items, itemIds).map((item) => item.id).join("\0")}`;
}
