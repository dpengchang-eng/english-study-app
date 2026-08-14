import { Timestamp } from "firebase/firestore";
import type { ReviewInterval, ReviewResult } from "../types";

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

export function answersMatch(input: string, expected: string): boolean {
  const norm = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/[“”"'.,!?;:()]/g, "")
      .replace(/\s+/g, " ");
  return norm(input).length > 0 && norm(input) === norm(expected);
}

export function buildCloze(sentence: string, phrase: string): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");
  if (re.test(sentence)) {
    return sentence.replace(re, "______");
  }
  return `${sentence}\n\n(填入：______)`;
}
