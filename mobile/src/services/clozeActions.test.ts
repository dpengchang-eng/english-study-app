import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { WordbookItem } from "../types";
import { finishCardOnce, passAndNextOnce } from "./clozeActions";
import { applyGoodPass } from "./practiceSrs";

const now = Date.parse("2026-08-15T10:00:00+09:00");

function item(box: 0 | 1 | 2 | 3 = 0): WordbookItem {
  return {
    id: "dinner",
    phrase: "dinner",
    ipa: "",
    senses: ["晚饭"],
    simpleEn: "Dinner is the evening meal.",
    sentenceContext: "I went out for dinner.",
    conversionId: "c1",
    blankStart: 15,
    blankEnd: 21,
    createdAt: now,
    dueAt: now,
    box,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState: "synced"
  };
}

describe("double 过 / 下一题 guards", () => {
  it("two 过 write Good once and advance one card", async () => {
    let current = item(0);
    let applyGood = 0;
    const busyRef = { current: false };
    const advancedIndexRef = { current: null as number | null };
    const writeGood = async (): Promise<void> => {
      applyGood += 1;
      current = applyGoodPass(current, now);
    };
    const run = (): ReturnType<typeof passAndNextOnce> =>
      passAndNextOnce({
        busyRef,
        advancedIndexRef,
        index: 0,
        cardCount: 3,
        wasCorrect: true,
        writeGood
      });
    const [first, second] = await Promise.all([run(), run()]);
    const passed = [first, second].filter((row) => row.status === "passed");
    assert.equal(passed.length, 1);
    assert.equal(applyGood, 1);
    assert.equal(current.box, 1);
    assert.equal(current.lastResult, "1");
    assert.deepEqual(passed[0], { status: "passed", index: 1, settled: false });
    assert.equal(busyRef.current, false);
  });

  it("failed 过 stays on the card and clears busy", async () => {
    const busyRef = { current: false };
    const advancedIndexRef = { current: null as number | null };
    const result = await passAndNextOnce({
      busyRef,
      advancedIndexRef,
      index: 0,
      cardCount: 3,
      wasCorrect: true,
      writeGood: async () => {
        throw new Error("writeLocal");
      }
    });
    assert.equal(result.status, "failed");
    assert.equal(advancedIndexRef.current, null);
    assert.equal(busyRef.current, false);
  });

  it("two 下一题 advance one card", () => {
    const busyRef = { current: false };
    const advancedIndexRef = { current: null as number | null };
    const args = { busyRef, advancedIndexRef, index: 0, cardCount: 3 };
    const first = finishCardOnce(args);
    const second = finishCardOnce(args);
    assert.deepEqual(first, { status: "advanced", index: 1, settled: false });
    assert.equal(second.status, "blocked");
    assert.equal(advancedIndexRef.current, 0);
  });

  it("ClozeScreen uses the sync guards, try/finally, and disables 下一题 while busy", () => {
    const cloze = readFileSync(new URL("../screens/ClozeScreen.tsx", import.meta.url), "utf8");
    assert.match(cloze, /passAndNextOnce/);
    assert.match(cloze, /finishCardOnce/);
    assert.match(cloze, /busyRef/);
    assert.match(cloze, /advancedIndexRef/);
    const pass = cloze.slice(cloze.indexOf("const passAndNext"), cloze.indexOf("const returnRoundToReview"));
    assert.match(pass, /busyRef\.current/);
    assert.match(pass, /try/);
    assert.match(pass, /finally/);
    assert.match(pass, /setBusy\(false\)/);
    assert.match(pass, /status === "passed"/);
    assert.doesNotMatch(pass, /status === "failed"[\s\S]*finishCard|status === "failed"[\s\S]*applyAdvance/);
    const ret = cloze.slice(cloze.indexOf("const returnRoundToReview"), cloze.indexOf("if (session === null)"));
    assert.match(ret, /try/);
    assert.match(ret, /finally/);
    assert.match(ret, /setBusy\(false\)/);
    const navigate = ret.indexOf("navigation.navigate");
    const catchAt = ret.indexOf("} catch");
    assert.ok(navigate > -1 && catchAt > navigate, "navigate only after a successful write");
    const nextBtn = cloze.slice(cloze.indexOf("<Text style={styles.btnText}>下一题</Text>") - 180, cloze.indexOf("<Text style={styles.btnText}>下一题</Text>"));
    assert.match(nextBtn, /disabled=\{busy\}/);
    assert.match(nextBtn, /finishCard/);
  });
});
