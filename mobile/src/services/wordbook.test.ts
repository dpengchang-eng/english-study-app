import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Token } from "../types";
import { phraseFromTokens, SAVE_SPAN_ERROR, selectWordTokens, wordbookBlankSpan } from "./wordbook";
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

describe("selectWordTokens", () => {
  it("allows a multi-word 说法 longer than six words", () => {
    const selected = selectWordTokens(sentence, sentence);
    assert.equal(selected.length, 8);
    assert.equal(phraseFromTokens(selected).phrase, "I'd like to grab coffee with you sometime");
  });

  it("saves 整句 as every word in the sentence", () => {
    const span = wholeSentenceSpan(sentence.length);
    const selected = tokensForSpan(sentence, span);
    const words = selectWordTokens(selected, sentence);
    assert.equal(words.length, sentence.length);
    assert.equal(words[0]?.id, "t0");
    assert.equal(words[words.length - 1]?.id, "t7");
  });

  it("rejects a hole in the span", () => {
    assert.throws(() => selectWordTokens([sentence[0], sentence[2]], sentence), new Error(SAVE_SPAN_ERROR));
  });

  it("blanks the whole sentence when the span is 整句", () => {
    const text = "I'd like to grab coffee with you sometime.";
    const span = wordbookBlankSpan(text, sentence, sentence, "I'd like to grab coffee with you sometime", 0, 41);
    assert.equal(span.phrase, text);
    assert.equal(span.start, 0);
    assert.equal(span.end, text.length);
    const part = wordbookBlankSpan(text, [sentence[4]], sentence, "coffee", 17, 23);
    assert.equal(text.slice(part.start, part.end), "coffee");
  });
});
