import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Token, WordbookItem } from "../types";
import { blankParts, offsetsFromTokens, resolveBlankSpan } from "./blank";
import { applyBox, nextGoodBox } from "./practiceSrs";
import { wordbookDraftFromSelection } from "./wordbookSelect";

const sentence = "I went out for dinner with my family tonight.";

describe("resolveBlankSpan", () => {
  it("keeps a span that already contains the phrase", () => {
    const span = resolveBlankSpan(sentence, "dinner", 15, 21);
    assert.equal(sentence.slice(span.start, span.end), "dinner");
  });

  it("finds the phrase when offsets miss it", () => {
    const span = resolveBlankSpan(sentence, "dinner", 0, 1);
    assert.equal(sentence.slice(span.start, span.end), "dinner");
    assert.equal(span.start, sentence.toLowerCase().indexOf("dinner"));
  });

  it("matches the phrase case-insensitively", () => {
    const span = resolveBlankSpan(sentence, "DINNER", 0, 0);
    assert.equal(sentence.slice(span.start, span.end), "dinner");
  });

  it("finds a multi-word phrase when spaces do not match exactly", () => {
    const text = "I'd like to grab  coffee with you.";
    const span = resolveBlankSpan(text, "grab coffee", 0, 4);
    assert.equal(text.slice(span.start, span.end), "grab  coffee");
  });

  it("does not use 0..phrase.length when token offsets are missing", () => {
    const offsets = offsetsFromTokens([{ surface: "dinner" }, { surface: "with" }]);
    assert.deepEqual(offsets, { start: -1, end: -1 });
    const span = resolveBlankSpan(sentence, "dinner", offsets.start, offsets.end);
    assert.equal(sentence.slice(span.start, span.end), "dinner");
    assert.ok(span.start > 0);
  });
});

describe("blankParts", () => {
  it("blanks the phrase even when saved offsets are wrong", () => {
    const { before, after } = blankParts(
      { wordbookItemId: "dinner", sentenceText: sentence, blankSpan: { start: 0, end: 1 }, hintGloss: "" },
      "dinner"
    );
    assert.equal(before, "I went out for ");
    assert.equal(after, " with my family tonight.");
  });
});

function tokensFrom(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\s]/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(text)) !== null) {
    const surface = match[0];
    tokens.push({
      id: `s0_t${index}`,
      lemma: surface.toLowerCase(),
      surface,
      isWord: /[A-Za-z0-9]/.test(surface),
      charStart: match.index,
      charEnd: match.index + surface.length
    });
    index += 1;
  }
  return tokens;
}

describe("practice blankSpan from wordbook selection", () => {
  const long = "I'd like to grab coffee with you sometime — does that work for you?";

  it("covers a 7+ word selection and a whole-sentence selection", () => {
    const tokens = tokensFrom(long);
    const words = tokens.filter((token) => token.isWord);
    const seven = wordbookDraftFromSelection({
      tokens: words.slice(0, 7),
      sentenceTokens: tokens,
      sentenceText: long,
      conversionId: "c1",
      ipa: "",
      senses: ["约咖啡"]
    });
    assert.equal(long.slice(seven.blankStart, seven.blankEnd), seven.phrase);
    assert.ok(seven.phrase.split(/\s+/).length >= 7);

    const whole = wordbookDraftFromSelection({
      tokens: words,
      sentenceTokens: tokens,
      sentenceText: long,
      conversionId: "c1",
      ipa: "",
      senses: []
    });
    assert.equal(whole.blankStart, 0);
    assert.equal(whole.blankEnd, long.length);
    assert.equal(whole.phrase, long);
    const card = {
      wordbookItemId: whole.lemmaKey,
      sentenceText: whole.sentenceContext,
      blankSpan: { start: whole.blankStart, end: whole.blankEnd },
      hintGloss: whole.senses[0] ?? ""
    };
    const { before, after } = blankParts(card, whole.phrase);
    assert.equal(before, "");
    assert.equal(after, "");
    assert.equal(card.hintGloss, "");
  });
});

describe("SRS Again +60s / Good 1d 3d 7d", () => {
  const now = 1_700_000_000_000;
  const item: WordbookItem = {
    id: "dinner",
    phrase: "dinner",
    ipa: "",
    senses: ["晚饭"],
    simpleEn: "Dinner is the evening meal.",
    sentenceContext: sentence,
    conversionId: "c1",
    blankStart: 15,
    blankEnd: 21,
    createdAt: now,
    dueAt: now,
    box: 0,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState: "synced"
  };

  it("moves Again to box 0 due in 60 seconds", () => {
    const next = applyBox(item, 0, now);
    assert.equal(next.box, 0);
    assert.equal(next.dueAt, now + 60_000);
    assert.equal(next.lastResult, "again");
    assert.equal(next.intervalDays, 0);
  });

  it("moves Good 0→1d, 1→3d, then 7d", () => {
    assert.equal(nextGoodBox(0), 1);
    assert.equal(nextGoodBox(1), 2);
    assert.equal(nextGoodBox(2), 3);
    assert.equal(nextGoodBox(3), 3);
    const day = applyBox(item, 1, now);
    assert.equal(day.dueAt, now + 1 * 24 * 60 * 60 * 1000);
    assert.equal(day.lastResult, "1");
    const three = applyBox({ ...item, box: 1 }, 2, now);
    assert.equal(three.dueAt, now + 3 * 24 * 60 * 60 * 1000);
    assert.equal(three.lastResult, "3");
    const seven = applyBox({ ...item, box: 2 }, 3, now);
    assert.equal(seven.dueAt, now + 7 * 24 * 60 * 60 * 1000);
    assert.equal(seven.lastResult, "7");
  });
});
