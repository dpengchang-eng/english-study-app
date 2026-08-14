import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyLimit, nextQuota, seoulDayKey } from "./quota";

describe("quota", () => {
  it("uses 20 for anonymous and 80 after account link", () => {
    assert.equal(dailyLimit(false), 20);
    assert.equal(dailyLimit(true), 80);
  });

  it("resets the count on a new Asia/Seoul day", () => {
    const day = seoulDayKey(new Date("2026-08-14T01:00:00+09:00"));
    const same = nextQuota({ convertCountToday: 7, convertDayKey: day }, new Date("2026-08-14T22:00:00+09:00"));
    assert.equal(same.convertCountToday, 7);
    const next = nextQuota({ convertCountToday: 7, convertDayKey: day }, new Date("2026-08-15T00:30:00+09:00"));
    assert.equal(next.convertCountToday, 0);
    assert.equal(next.convertDayKey, "2026-08-15");
  });
});
