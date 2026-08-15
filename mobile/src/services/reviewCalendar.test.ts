import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { WordbookItem } from "../types";
import {
  calendarDayKey,
  dottedDayKeys,
  dueLabel,
  itemsOnCalendarDay,
  monthCells,
  practiceSourceItems,
  seoulDayKey,
  seoulDayStartMs,
  shiftMonth,
  todayReviewCount
} from "./reviewCalendar";

const DAY = 24 * 60 * 60 * 1000;

function item(id: string, dueAt: number): WordbookItem {
  return {
    id,
    phrase: id,
    ipa: "",
    senses: [],
    simpleEn: "",
    sentenceContext: id,
    conversionId: "c1",
    blankStart: 0,
    blankEnd: id.length,
    createdAt: dueAt,
    dueAt,
    box: 0,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState: "synced"
  };
}

describe("Seoul day-bucketing", () => {
  it("uses the Asia/Seoul calendar day of dueAt", () => {
    const now = Date.parse("2026-08-15T10:00:00+09:00");
    assert.equal(seoulDayKey(new Date(now)), "2026-08-15");
    assert.equal(calendarDayKey(Date.parse("2026-08-15T00:00:00+09:00"), now), "2026-08-15");
    assert.equal(calendarDayKey(Date.parse("2026-08-15T22:30:00+09:00"), now), "2026-08-15");
    assert.equal(calendarDayKey(Date.parse("2026-08-16T01:00:00+09:00"), now), "2026-08-16");
    assert.equal(calendarDayKey(Date.parse("2026-08-14T15:00:00Z"), now), "2026-08-15");
  });

  it("treats dueAt before today 00:00 Seoul as today and does not rewrite dueAt", () => {
    const now = Date.parse("2026-08-15T10:00:00+09:00");
    const todayStart = seoulDayStartMs(now);
    assert.equal(todayStart, Date.parse("2026-08-15T00:00:00+09:00"));
    assert.equal(calendarDayKey(todayStart - 1, now), "2026-08-15");
    assert.equal(calendarDayKey(Date.parse("2026-08-14T23:59:59+09:00"), now), "2026-08-15");
    assert.equal(calendarDayKey(Date.parse("2026-08-10T08:00:00+09:00"), now), "2026-08-15");
    assert.equal(calendarDayKey(Date.parse("2026-08-14T14:59:59Z"), now), "2026-08-15");

    const overdue = item("old", Date.parse("2026-08-10T08:00:00+09:00"));
    const dueAtBefore = overdue.dueAt;
    assert.equal(calendarDayKey(overdue.dueAt, now), "2026-08-15");
    assert.equal(overdue.dueAt, dueAtBefore);
  });

  it("does not count a later Seoul day as today", () => {
    const now = Date.parse("2026-08-15T10:00:00+09:00");
    assert.equal(calendarDayKey(Date.parse("2026-08-16T00:00:00+09:00"), now), "2026-08-16");
  });
});

describe("overdue-counts-as-today", () => {
  const now = Date.parse("2026-08-15T10:00:00+09:00");
  const overdue = item("overdue", Date.parse("2026-08-12T09:00:00+09:00"));
  const todayLater = item("today-later", Date.parse("2026-08-15T21:00:00+09:00"));
  const tomorrow = item("tomorrow", Date.parse("2026-08-16T09:00:00+09:00"));
  const items = [overdue, todayLater, tomorrow];

  it("puts overdue items on today for the list, dots, and 待复习 N", () => {
    const today = itemsOnCalendarDay(items, "2026-08-15", now);
    assert.deepEqual(
      today.map((row) => row.id),
      ["overdue", "today-later"]
    );
    assert.equal(todayReviewCount(items, now), 2);

    const dots = dottedDayKeys(items, now);
    assert.equal(dots.has("2026-08-15"), true);
    assert.equal(dots.has("2026-08-16"), true);
    assert.equal(dots.has("2026-08-12"), false);
  });

  it("hides overdue items when another day is selected", () => {
    assert.deepEqual(
      itemsOnCalendarDay(items, "2026-08-12", now).map((row) => row.id),
      []
    );
    assert.deepEqual(
      itemsOnCalendarDay(items, "2026-08-16", now).map((row) => row.id),
      ["tomorrow"]
    );
  });

  it("labels overdue and today as 今天, near days as N 天后, else a date", () => {
    assert.equal(dueLabel(overdue.dueAt, now), "今天");
    assert.equal(dueLabel(todayLater.dueAt, now), "今天");
    assert.equal(dueLabel(tomorrow.dueAt, now), "1 天后");
    assert.equal(dueLabel(Date.parse("2026-08-18T09:00:00+09:00"), now), "3 天后");
    assert.equal(dueLabel(Date.parse("2026-08-25T09:00:00+09:00"), now), "8月25日");
  });
});

describe("month grid", () => {
  it("builds a Sunday-start grid and shifts month only", () => {
    const cells = monthCells(2026, 8);
    assert.equal(cells[0], null);
    assert.deepEqual(cells[6], { dayKey: "2026-08-01", day: 1 });
    assert.deepEqual(cells.at(-1), { dayKey: "2026-08-31", day: 31 });
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  });
});

describe("createPractice list", () => {
  it("uses the passed list instead of re-querying due items", () => {
    const source = readFileSync(new URL("./practice.ts", import.meta.url), "utf8");
    assert.match(source, /practiceSourceItems\(items\)/);
    assert.doesNotMatch(source, /queryDueWordbook/);
  });

  it("keeps the given subset in dueAt order and does not drop future items", () => {
    const now = Date.parse("2026-08-15T10:00:00+09:00");
    const later = item("later", now + 3 * DAY);
    const sooner = item("sooner", now + 60_000);
    const source = practiceSourceItems([later, sooner]);
    assert.deepEqual(
      source.map((row) => row.id),
      ["sooner", "later"]
    );
  });
});

describe("locked review / wordbook calendar copy", () => {
  it("keeps the calendar on 复习 and does not use 明天再来", () => {
    const review = readFileSync(new URL("../screens/ReviewScreen.tsx", import.meta.url), "utf8");
    assert.match(review, /MonthCalendar/);
    assert.match(review, /这天没有要复习的/);
    assert.match(review, /开始填空/);
    assert.match(review, /先存词/);
    assert.doesNotMatch(review, /明天再来/);
  });

  it("uses the same calendar as a filter on 词本 and does not start cloze", () => {
    const wordbook = readFileSync(new URL("../screens/WordbookScreen.tsx", import.meta.url), "utf8");
    assert.match(wordbook, /MonthCalendar/);
    assert.match(wordbook, /去转换/);
    assert.doesNotMatch(wordbook, /openCloze/);
    assert.doesNotMatch(wordbook, /开始填空/);
    assert.doesNotMatch(wordbook, /练待复习的/);
  });
});
