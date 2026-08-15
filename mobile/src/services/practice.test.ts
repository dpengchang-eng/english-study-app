import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Token, WordbookItem } from "../types";
import { readFileSync } from "node:fs";
import { blankParts, offsetsFromTokens, resolveBlankSpan } from "./blank";
import { clozeAnswerLine } from "./practice";
import { applyBox, applyGoodPass, keepSrs, nextGoodBox } from "./practiceSrs";
import { returnDueAtToTodaySeoul, seoulDayKey, seoulDayStartMs } from "./reviewCalendar";
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

  it("blanks a one-word item and a short word", () => {
    const one = "I went out for dinner with my family tonight.";
    const oneSpan = resolveBlankSpan(one, "dinner", 0, 0);
    assert.equal(one.slice(oneSpan.start, oneSpan.end), "dinner");

    const short = "I ate a pear.";
    const aSpan = resolveBlankSpan(short, "a", 0, 0);
    assert.equal(short.slice(aSpan.start, aSpan.end), "a");
    assert.equal(aSpan.start, short.indexOf(" a ") + 1);

    const toText = "I like to cook.";
    const toSpan = resolveBlankSpan(toText, "to", 0, 1);
    assert.equal(toText.slice(toSpan.start, toSpan.end), "to");
  });

  it("does not blank a letter inside a longer word when a/to/I have no standalone hit", () => {
    const apple = "Apple pie.";
    const aSpan = resolveBlankSpan(apple, "a", 0, 1);
    assert.notEqual(apple.slice(aSpan.start, aSpan.end).toLowerCase(), "a");
    assert.equal(aSpan.start, aSpan.end);
    assert.equal(apple.slice(0, 1), "A");

    const today = "See you tomorrow.";
    const toSpan = resolveBlankSpan(today, "to", 0, 2);
    assert.notEqual(today.slice(toSpan.start, toSpan.end).toLowerCase(), "to");
    assert.ok(today.toLowerCase().includes("to"));

    const italy = "Visit Italy.";
    const iSpan = resolveBlankSpan(italy, "I", 6, 7);
    assert.notEqual(italy.slice(iSpan.start, iSpan.end), "I");
    assert.equal(italy[6], "I");
  });

  it("uses the whole saved span when the phrase is missing and the span is a whole word", () => {
    const sentence = "See you tomorrow.";
    const span = resolveBlankSpan(sentence, "xyz", 0, 3);
    assert.equal(sentence.slice(span.start, span.end), "See");
  });

  it("blankParts misses cleanly on Apple pie instead of carving A", () => {
    const { before, after } = blankParts(
      { wordbookItemId: "a", sentenceText: "Apple pie.", blankSpan: { start: 0, end: 1 }, hintGloss: "" },
      "a"
    );
    assert.equal(before, "Apple pie.");
    assert.equal(after, "");
  });
});

describe("blank search has no substring fallback", () => {
  it("does not use indexOf / indexInsensitive after a whole-word miss", () => {
    const src = readFileSync(new URL("./blank.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /indexInsensitive/);
    assert.doesNotMatch(src, /indexOf/);
  });
});

describe("clozeAnswerLine", () => {
  it("joins phrase, up to 3 Chinese senses, and simpleEn on one line", () => {
    assert.equal(
      clozeAnswerLine({
        phrase: "dinner",
        senses: ["晚饭", "正餐", "宴会", "多余"],
        simpleEn: "Dinner is the evening meal."
      }),
      "dinner  晚饭 · 正餐 · 宴会  Dinner is the evening meal."
    );
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

describe("cloze after-answer SRS", () => {
  const now = Date.parse("2026-08-15T10:00:00+09:00");
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

  it("submit does not change dueAt or box on correct or reveal", () => {
    const correct = keepSrs(item);
    assert.equal(correct.dueAt, item.dueAt);
    assert.equal(correct.box, item.box);
    const miss = keepSrs({ ...item, box: 2, dueAt: now - 3_000 });
    assert.equal(miss.dueAt, now - 3_000);
    assert.equal(miss.box, 2);
    const src = readFileSync(new URL("./practice.ts", import.meta.url), "utf8");
    const submit = src.slice(src.indexOf("export async function submitPractice"), src.indexOf("export async function passPractice"));
    assert.match(submit, /dueAt: current\.dueAt/);
    assert.match(submit, /box: current\.box/);
    assert.doesNotMatch(submit, /applyBox/);
    assert.doesNotMatch(submit, /applyGoodPass/);
    assert.doesNotMatch(submit, /updateWordbookSrs/);
    assert.doesNotMatch(submit, /nextGoodBox/);
  });

  it("过 advances with the existing Good SRS", () => {
    const next = applyGoodPass(item, now);
    assert.equal(next.box, 1);
    assert.equal(next.dueAt, now + 1 * 24 * 60 * 60 * 1000);
    assert.equal(next.lastResult, "1");
    const later = applyGoodPass({ ...item, box: 1 }, now);
    assert.equal(later.box, 2);
    assert.equal(later.dueAt, now + 3 * 24 * 60 * 60 * 1000);
    const src = readFileSync(new URL("./practice.ts", import.meta.url), "utf8");
    const pass = src.slice(src.indexOf("export async function passPractice"), src.indexOf("export async function returnPracticedToToday"));
    assert.match(pass, /applyGoodPass/);
    assert.match(pass, /updateWordbookSrs/);
  });

  it("再练 and 下一题 after miss do not change dueAt or box", () => {
    const due = now - 60_000;
    const missed = { ...item, box: 2 as const, dueAt: due };
    const kept = keepSrs(missed);
    assert.equal(kept.dueAt, due);
    assert.equal(kept.box, 2);
    const cloze = readFileSync(new URL("../screens/ClozeScreen.tsx", import.meta.url), "utf8");
    const retry = cloze.slice(cloze.indexOf("const retrySameCard"), cloze.indexOf("const finishCard"));
    assert.match(retry, /resetCard/);
    assert.doesNotMatch(retry, /passPractice/);
    assert.doesNotMatch(retry, /updateWordbookSrs/);
    assert.doesNotMatch(retry, /applyGoodPass/);
    const afterCorrect = cloze.slice(cloze.indexOf("wasCorrect ? ("), cloze.indexOf(") : ("));
    assert.match(afterCorrect, /过/);
    assert.match(afterCorrect, /再练/);
    assert.doesNotMatch(afterCorrect, /下一题/);
    const afterMiss = cloze.slice(cloze.indexOf("<Text style={styles.btnText}>下一题</Text>"));
    const nextHandler = cloze.slice(cloze.indexOf("onPress={finishCard}"), cloze.indexOf("<Text style={styles.btnText}>下一题</Text>"));
    assert.match(afterMiss, /再练/);
    assert.doesNotMatch(afterMiss, /过/);
    assert.match(nextHandler, /finishCard/);
    assert.doesNotMatch(nextHandler, /passPractice/);
  });

  it("放回复习 sets dueAt to today Seoul and keeps box", () => {
    const future = { ...item, box: 2 as const, dueAt: now + 7 * 24 * 60 * 60 * 1000, lastResult: "3" as const };
    const next = returnDueAtToTodaySeoul(future, now);
    assert.equal(next.dueAt, seoulDayStartMs(now));
    assert.equal(next.dueAt, Date.parse("2026-08-15T00:00:00+09:00"));
    assert.equal(next.box, 2);
    assert.equal(next.lastResult, "3");
    assert.equal(next.intervalDays, future.intervalDays);
    assert.equal(next.reviewCount, future.reviewCount);
    assert.equal(seoulDayKey(new Date(next.dueAt)), "2026-08-15");
    const src = readFileSync(new URL("./practice.ts", import.meta.url), "utf8");
    const ret = src.slice(src.indexOf("export async function returnPracticedToToday"));
    assert.match(ret, /returnDueAtToTodaySeoul/);
    assert.doesNotMatch(ret, /applyBox/);
    assert.doesNotMatch(ret, /applyGoodPass/);
  });
});
