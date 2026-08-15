import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Token } from "../types";
import {
  isWholeSentence,
  sentenceChangeSpan,
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
  it("starts on the tapped word and grows a consecutive span", () => {
    const coffee = spanFromSelected(words, [words[4]]);
    assert.deepEqual(coffee, { start: 4, end: 4 });
    const grabCoffee = tapLookupWord(coffee, 3);
    assert.deepEqual(grabCoffee, { start: 3, end: 4 });
    assert.deepEqual(
      tokensForSpan(words, grabCoffee).map((token) => token.surface),
      ["grab", "coffee"]
    );
    assert.equal(isWholeSentence(grabCoffee, words.length), false);
  });

  it("整句 selects every word, and 上一句 keeps that after a sentence change", () => {
    const whole = wholeSentenceSpan(words.length);
    assert.deepEqual(whole, { start: 0, end: 5 });
    assert.equal(isWholeSentence(whole, words.length), true);
    assert.deepEqual(
      tokensForSpan(words, whole).map((token) => token.surface),
      ["I'd", "like", "to", "grab", "coffee", "sometime"]
    );
    assert.deepEqual(sentenceChangeSpan(4, true), { start: 0, end: 3 });
    assert.deepEqual(sentenceChangeSpan(4, false), { start: 0, end: 0 });
  });

  it("shrinks from an endpoint and does not leave holes", () => {
    const span = { start: 1, end: 4 };
    assert.deepEqual(tapLookupWord(span, 1), { start: 2, end: 4 });
    assert.deepEqual(tapLookupWord(span, 4), { start: 1, end: 3 });
    assert.deepEqual(tapLookupWord(span, 5), { start: 1, end: 5 });
  });
});

describe("lookup sheet copy", () => {
  it("keeps sentence-first lookup and 整句 / 上一句 / 下一句", () => {
    const lookup = readFileSync(new URL("../screens/LookupScreen.tsx", import.meta.url), "utf8");
    const result = readFileSync(new URL("../screens/ResultScreen.tsx", import.meta.url), "utf8");
    assert.match(lookup, /整句/);
    assert.match(lookup, /上一句/);
    assert.match(lookup, /下一句/);
    assert.match(lookup, /simpleEn/);
    assert.match(lookup, /tapLookupWord/);
    assert.match(lookup, /wholeSentenceSpan/);
    assert.match(result, /onTapToken/);
    assert.match(result, /onLongPressToken/);
    assert.match(result, /openLookup/);
    assert.match(result, /sentenceId/);
    assert.doesNotMatch(result, /to - from \+ 1 > 6/);
    assert.doesNotMatch(result, /保存短语/);
    assert.doesNotMatch(result, /setPicked/);
  });
});
