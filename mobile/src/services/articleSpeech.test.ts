import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideListenAction,
  indexById,
  nextPlayIndex,
  resolveStartIndex,
  revealScrollY,
  speakableItems
} from "./articleSpeech";

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
  it("starts 听全文 and 复读 at sentence 1", () => {
    assert.equal(resolveStartIndex("all", 4, 2), 0);
    assert.equal(resolveStartIndex("loopAll", 4, 2), 0);
  });

  it("starts 听 and 循环 on that sentence", () => {
    assert.equal(resolveStartIndex("once", 4, 3), 3);
    assert.equal(resolveStartIndex("loopOne", 4, 2), 2);
  });

  it("does not fall back to sentence 1 when 听 / 循环 has no line", () => {
    assert.equal(resolveStartIndex("once", 4, null), null);
    assert.equal(resolveStartIndex("loopOne", 4, null), null);
    const items = speakableItems([
      { id: "blank", text: "   " },
      { id: "real", text: "Hello." }
    ]);
    assert.equal(indexById(items, "blank"), null);
    assert.equal(resolveStartIndex("once", items.length, indexById(items, "blank")), null);
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

  it("repeats one sentence for 循环", () => {
    assert.equal(nextPlayIndex("loopOne", 1, 3), 1);
  });

  it("wraps the article for 复读", () => {
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

  it("loops one sentence for 循环 and the whole article for 复读", () => {
    assert.deepEqual(heard("loopOne", 5, 2, 4), [2, 2, 2, 2]);
    assert.deepEqual(heard("loopAll", 3, 0, 7), [0, 1, 2, 0, 1, 2, 0]);
  });

  it("keeps per-sentence 听 as play once", () => {
    assert.deepEqual(heard("once", 5, 3, 10), [3]);
  });

  it("plays nothing when the article has no speakable lines", () => {
    assert.deepEqual(heard("all", 0, 0, 10), []);
    assert.deepEqual(heard("loopAll", 0, null, 10), []);
    assert.deepEqual(heard("once", 0, 0, 10), []);
  });
});

describe("decideListenAction", () => {
  it("stops when the same control is tapped again", () => {
    assert.equal(decideListenAction("all", "s0", { kind: "all" }).action, "stop");
    assert.equal(decideListenAction("loopAll", "s2", { kind: "loopAll" }).action, "stop");
    assert.equal(decideListenAction("once", "s1", { kind: "once", id: "s1" }).action, "stop");
    assert.equal(decideListenAction("loopOne", "s1", { kind: "loopOne", id: "s1" }).action, "stop");
  });

  it("starts the other mode so only one of the four is live", () => {
    assert.deepEqual(decideListenAction("all", "s0", { kind: "loopAll" }), { action: "start", mode: "loopAll" });
    assert.deepEqual(decideListenAction("loopAll", "s0", { kind: "all" }), { action: "start", mode: "all" });
    assert.deepEqual(decideListenAction("all", "s2", { kind: "once", id: "s2" }), {
      action: "start",
      mode: "once",
      id: "s2"
    });
    assert.deepEqual(decideListenAction("once", "s1", { kind: "loopOne", id: "s1" }), {
      action: "start",
      mode: "loopOne",
      id: "s1"
    });
    assert.deepEqual(decideListenAction("loopOne", "s1", { kind: "once", id: "s2" }), {
      action: "start",
      mode: "once",
      id: "s2"
    });
    assert.deepEqual(decideListenAction("idle", null, { kind: "all" }), { action: "start", mode: "all" });
  });
});

describe("revealScrollY", () => {
  it("leaves the card alone when it is already on screen", () => {
    assert.equal(revealScrollY(100, 80, 0, 400), null);
  });

  it("scrolls down when 听全文 walks past the fold", () => {
    assert.equal(revealScrollY(500, 80, 0, 400, 16), 196);
  });

  it("scrolls up when 复读 wraps back to sentence 1", () => {
    assert.equal(revealScrollY(0, 80, 600, 400, 16), 0);
  });
});
