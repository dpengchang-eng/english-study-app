import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { queueReviewFocus, takeReviewFocus } from "./reviewFocus";

describe("reviewFocus", () => {
  it("hands 放回复习 day and checked ids to Review once", () => {
    assert.equal(takeReviewFocus(), null);
    queueReviewFocus({ dayKey: "2026-08-15", checkedIds: ["a", "b"] });
    assert.deepEqual(takeReviewFocus(), { dayKey: "2026-08-15", checkedIds: ["a", "b"] });
    assert.equal(takeReviewFocus(), null);
  });

  it("Review consumes the focus and Cloze queues it on 放回复习", () => {
    const review = readFileSync(new URL("../screens/ReviewScreen.tsx", import.meta.url), "utf8");
    const cloze = readFileSync(new URL("../screens/ClozeScreen.tsx", import.meta.url), "utf8");
    assert.match(review, /takeReviewFocus/);
    assert.match(review, /setPinnedChecked\(focus\.checkedIds\)/);
    assert.match(review, /setSelectedDay\(focus\.dayKey\)/);
    assert.match(cloze, /queueReviewFocus/);
    assert.match(cloze, /放回复习/);
    assert.match(cloze, /returnPracticedToToday/);
  });
});
