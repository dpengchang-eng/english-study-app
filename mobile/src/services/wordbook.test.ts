import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Token } from "../types";
import { blankSpan, phraseFromTokens, selectWordTokens } from "./wordbook";
import { tokensForSpan, wholeSentenceSpan } from "./lookupSelection";

function word(id: string, surface: string, start: number): Token {
  return {
    id,
    lemma: surface.toLowerCase(),
    surface,
    isWord: true,
    charStart: start,
    charEnd: start + surface.length
  };
}

function punct(id: string, surface: string, start: number): Token {
  return { id, lemma: surface, surface, isWord: false, charStart: start, charEnd: start + surface.length };
}

const sentence = [
  word("t0", "I'd", 0),
  word("t1", "like", 4),
  word("t2", "to", 9),
  word("t3", "grab", 12),
  word("t4", "coffee", 17),
  word("t5", "with", 24),
  word("t6", "you", 29),
  word("t7", "sometime", 33)
];

describe("saveToWordbook", () => {
  it("allows a consecutive span longer than six words", () => {
    const selected = selectWordTokens(sentence, sentence);
    assert.equal(selected.length, 8);
    assert.equal(phraseFromTokens(selected).phrase, "I'd like to grab coffee with you sometime");
  });

  it("lets punctuation stay in a whole-sentence span and blanks the sentence", () => {
    const text = "I'd like coffee.";
    const tokens = [word("w0", "I'd", 0), word("w1", "like", 4), word("w2", "coffee", 9), punct("p0", ".", 15)];
    const span = wholeSentenceSpan(3);
    const selected = tokensForSpan(tokens, span);
    assert.equal(selected[selected.length - 1]?.surface, ".");
    const blank = blankSpan(text, selected, tokens);
    assert.deepEqual(blank, { start: 0, end: text.length });
    assert.equal(text.slice(blank.start, blank.end), text);
  });

  it("sets blankSpan to the current selection and rejects only an empty selection", () => {
    const text = "I'd like to grab coffee with you sometime.";
    const part = blankSpan(text, [sentence[4]], sentence);
    assert.equal(text.slice(part.start, part.end), "coffee");
    assert.throws(() => selectWordTokens([], sentence), /没有可保存的词/);
  });
});
