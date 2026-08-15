import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indexById, nextPlayIndex, resolveStartIndex, speakableItems } from "./articleSpeech";

describe("speakableItems", () => {
  it("drops blank sentences so a long article still plays the real lines", () => {
    const items = speakableItems([
      { id: "s0", text: "First." },
      { id: "s1", text: "   " },
      { id: "s2", text: "Third." }
    ]);
    assert.deepEqual(
      items.map((item) => item.id),
      ["s0", "s2"]
    );
  });
});

describe("resolveStartIndex", () => {
  it("starts 听全文 and 全文循环 at the first sentence", () => {
    assert.equal(resolveStartIndex("all", 4, 2), 0);
    assert.equal(resolveStartIndex("loopAll", 4, 2), 0);
  });

  it("starts 单句循环 on the selected sentence, or the first if none", () => {
    assert.equal(resolveStartIndex("loopOne", 4, 2), 2);
    assert.equal(resolveStartIndex("loopOne", 4, null), 0);
    assert.equal(resolveStartIndex("once", 4, 3), 3);
  });

  it("returns null when there is nothing to read", () => {
    assert.equal(resolveStartIndex("all", 0, 0), null);
  });
});

describe("nextPlayIndex", () => {
  it("plays 听 once and then stops", () => {
    assert.equal(nextPlayIndex("once", 1, 3), null);
  });

  it("walks every sentence for 听全文, then stops", () => {
    assert.equal(nextPlayIndex("all", 0, 3), 1);
    assert.equal(nextPlayIndex("all", 1, 3), 2);
    assert.equal(nextPlayIndex("all", 2, 3), null);
  });

  it("repeats the same sentence for 单句循环", () => {
    assert.equal(nextPlayIndex("loopOne", 1, 3), 1);
  });

  it("wraps the article for 全文循环", () => {
    assert.equal(nextPlayIndex("loopAll", 0, 3), 1);
    assert.equal(nextPlayIndex("loopAll", 2, 3), 0);
  });
});

describe("indexById", () => {
  it("finds the selected sentence in the playlist", () => {
    const items = [
      { id: "s0" },
      { id: "s1" }
    ];
    assert.equal(indexById(items, "s1"), 1);
    assert.equal(indexById(items, "missing"), null);
    assert.equal(indexById(items, null), null);
  });
});

function heard(mode: "once" | "all" | "loopOne" | "loopAll", length: number, selected: number | null, steps: number): number[] {
  let index = resolveStartIndex(mode, length, selected);
  const ids: number[] = [];
  while (index != null && ids.length < steps) {
    ids.push(index);
    index = nextPlayIndex(mode, index, length);
  }
  return ids;
}

describe("article playthrough", () => {
  it("plays a multi-sentence result all the way through with 听全文", () => {
    assert.deepEqual(heard("all", 5, 2, 10), [0, 1, 2, 3, 4]);
  });

  it("repeats one sentence for 单句循环 and the article for 全文循环", () => {
    assert.deepEqual(heard("loopOne", 5, 2, 4), [2, 2, 2, 2]);
    assert.deepEqual(heard("loopAll", 3, 0, 7), [0, 1, 2, 0, 1, 2, 0]);
  });

  it("keeps per-sentence 听 as play once", () => {
    assert.deepEqual(heard("once", 5, 3, 10), [3]);
  });
});
