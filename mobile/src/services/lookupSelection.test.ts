import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Token } from "../types";
import {
  firstWordSpan,
  isWholeSentence,
  spanFromSelected,
  tapLookupWord,
  tokensForSpan,
  wholeSentenceSpan
} from "./lookupSelection";

function word(id: string, surface: string): Token {
  return { id, lemma: surface.toLowerCase(), surface, isWord: true };
}

const words = [
  word("w0", "I'd"),
  word("w1", "like"),
  word("w2", "to"),
  word("w3", "grab"),
  word("w4", "coffee"),
  word("w5", "sometime")
];

describe("lookup selection", () => {
  it("starts on the tapped word and grows only from an adjacent end", () => {
    const coffee = spanFromSelected(words, [words[4]]);
    assert.deepEqual(coffee, { start: 4, end: 4 });
    const grabCoffee = tapLookupWord(coffee, 3);
    assert.deepEqual(grabCoffee, { start: 3, end: 4 });
    assert.deepEqual(
      tokensForSpan(words, grabCoffee).map((token) => token.surface),
      ["grab", "coffee"]
    );
    assert.deepEqual(tapLookupWord(coffee, 1), { start: 1, end: 1 });
    assert.equal(isWholeSentence(grabCoffee, words.length), false);
  });

  it("整句 selects every word; 上一句 / 下一句 reset to the first isWord", () => {
    const whole = wholeSentenceSpan(words.length);
    assert.deepEqual(whole, { start: 0, end: 5 });
    assert.equal(isWholeSentence(whole, words.length), true);
    assert.deepEqual(
      tokensForSpan(words, whole).map((token) => token.surface),
      ["I'd", "like", "to", "grab", "coffee", "sometime"]
    );
    assert.deepEqual(firstWordSpan(), { start: 0, end: 0 });
  });

  it("shrinks a word inside near one end, and jumps when the tap is not adjacent", () => {
    const span = { start: 1, end: 4 };
    assert.deepEqual(tapLookupWord(span, 2), { start: 2, end: 4 });
    assert.deepEqual(tapLookupWord(span, 3), { start: 1, end: 3 });
    assert.deepEqual(tapLookupWord(span, 5), { start: 1, end: 5 });
    assert.deepEqual(tapLookupWord(span, 0), { start: 0, end: 0 });
  });
});

describe("lookup sheet copy", () => {
  it("keeps the frontend-word-sentence.md sheet: sentence, then 上一句 | 整句 | 下一句", () => {
    const lookup = readFileSync(new URL("../screens/LookupScreen.tsx", import.meta.url), "utf8");
    const result = readFileSync(new URL("../screens/ResultScreen.tsx", import.meta.url), "utf8");
    const nav = readFileSync(new URL("../navigation/RootNavigator.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../screens/HomeScreen.tsx", import.meta.url), "utf8");
    const sentenceAt = lookup.indexOf("styles.sentence");
    const prevAt = lookup.indexOf("上一句");
    const wholeAt = lookup.indexOf("整句");
    const nextAt = lookup.indexOf("下一句");
    assert.ok(sentenceAt >= 0 && sentenceAt < prevAt && prevAt < wholeAt && wholeAt < nextAt);
    assert.match(lookup, /加入词本/);
    assert.match(lookup, /lookupWord\(\{ lemma, surface: phrase, sentenceContext \}\)/);
    assert.match(lookup, /peekSpeechSpeed/);
    assert.match(lookup, /firstWordSpan/);
    assert.doesNotMatch(lookup, /存入词本/);
    assert.doesNotMatch(lookup, /听全文|复读全文/);
    assert.doesNotMatch(lookup, /styles\.phrase/);
    assert.match(nav, /sheetAllowedDetents:\s*\[0\.65\]/);
    assert.match(result, /onTapToken/);
    assert.match(result, /onLongPressToken/);
    assert.match(result, /openLookup/);
    assert.doesNotMatch(result, /setPicked|保存短语/);
    assert.doesNotMatch(home, /openLookup/);
  });
});
