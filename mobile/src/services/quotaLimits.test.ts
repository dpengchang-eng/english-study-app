import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyLimit, remainingToday, seoulDayKey } from "./quotaLimits";

describe("quotaLimits", () => {
  it("uses 20 for anonymous and 80 after Google link", () => {
    assert.equal(dailyLimit(false), 20);
    assert.equal(dailyLimit(true), 80);
    assert.equal(remainingToday(3, false), 17);
    assert.equal(remainingToday(3, true), 77);
    assert.equal(remainingToday(20, false), 0);
    assert.equal(remainingToday(20, true), 60);
  });

  it("uses the Asia/Seoul calendar day", () => {
    assert.equal(seoulDayKey(new Date("2026-08-14T01:00:00+09:00")), "2026-08-14");
    assert.equal(seoulDayKey(new Date("2026-08-13T16:00:00Z")), "2026-08-14");
  });
});
