import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  applyReviewPinEffect,
  queueReviewFocus,
  resetReviewPinForDay,
  takeReviewFocus,
  toggleReviewChecked
} from "./reviewFocus";

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
    assert.match(review, /applyReviewPinEffect/);
    assert.match(review, /toggleReviewChecked/);
    assert.match(review, /pinConsumedRef/);
    assert.match(cloze, /queueReviewFocus/);
    assert.match(cloze, /放回复习/);
    assert.match(cloze, /returnPracticedToToday/);
  });
});

describe("放回复习 pin is one-shot", () => {
  it("consumes the pin on first apply and ignores later dayIds refreshes", () => {
    let state = applyReviewPinEffect({ pinned: ["a", "b"], checked: [], consumed: false }, "a\0b\0c");
    assert.deepEqual(state.checked, ["a", "b"]);
    assert.equal(state.pinned, null);
    assert.equal(state.consumed, true);
    state = applyReviewPinEffect(state, "a\0b\0c\0d");
    assert.deepEqual(state.checked, ["a", "b"]);
    assert.equal(state.consumed, true);
  });

  it("clears the pin on toggle so user unchecks win", () => {
    const landed = applyReviewPinEffect({ pinned: ["a", "b"], checked: [], consumed: false }, "a\0b");
    const toggled = toggleReviewChecked(landed, "a");
    assert.equal(toggled.pinned, null);
    assert.equal(toggled.consumed, true);
    assert.deepEqual(toggled.checked, ["b"]);
    const afterRefresh = applyReviewPinEffect(toggled, "a\0b");
    assert.deepEqual(afterRefresh.checked, ["b"]);
  });

  it("changing calendar day resets checks and the pin", () => {
    const next = resetReviewPinForDay("x\0y");
    assert.equal(next.pinned, null);
    assert.equal(next.consumed, false);
    assert.deepEqual(next.checked, ["x", "y"]);
  });
});
