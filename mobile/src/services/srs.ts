import { Timestamp } from "firebase/firestore";
import type { ReviewInterval, ReviewResult, WordbookItem } from "../types";

export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function intervalFromResult(result: ReviewResult): ReviewInterval {
  if (result === "1") return 1;
  if (result === "3") return 3;
  if (result === "7") return 7;
  return 0;
}

export function nextDueAt(result: ReviewResult, now = new Date()): Timestamp {
  if (result === "again") {
    const soon = new Date(now);
    soon.setMinutes(soon.getMinutes() + 10);
    return Timestamp.fromDate(soon);
  }
  return Timestamp.fromDate(addDays(now, intervalFromResult(result)));
}

export function bumpAfterCorrect(item: WordbookItem): ReviewResult {
  if (item.intervalDays <= 0) return "1";
  if (item.intervalDays === 1) return "3";
  return "7";
}

export function answersMatch(input: string, expected: string): boolean {
  const norm = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/[“”"'.,!?;:()]/g, "")
      .replace(/\s+/g, " ");
  return norm(input).length > 0 && norm(input) === norm(expected);
}

export function findBlankSpan(sentence: string, phrase: string): { start: number; end: number } {
  const hay = sentence.toLowerCase();
  const needle = phrase.toLowerCase();
  const start = hay.indexOf(needle);
  if (start >= 0) return { start, end: start + phrase.length };
  return { start: 0, end: 0 };
}

export function isDue(item: WordbookItem, now = new Date()): boolean {
  try {
    return item.dueAt.toDate().getTime() <= now.getTime();
  } catch {
    return true;
  }
}

export function isMastered(item: WordbookItem): boolean {
  return item.intervalDays === 7;
}

export function samePhrase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
