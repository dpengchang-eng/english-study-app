import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignTokens, buildSentences, regexRetokenize } from "./align";

describe("alignTokens", () => {
  it("uses UTF-16 half-open offsets when surfaces match in order", () => {
    const sentence = "I'd like coffee.";
    const tokens = alignTokens(
      sentence,
      [
        { surface: "I'd", lemma: "i would", pos: "PRON", isWord: true },
        { surface: "like", lemma: "like", pos: "VERB", isWord: true },
        { surface: "coffee", lemma: "coffee", pos: "NOUN", isWord: true },
        { surface: ".", lemma: ".", pos: "PUNCT", isWord: false }
      ],
      "s0"
    );
    assert.equal(tokens[0]?.charStart, 0);
    assert.equal(tokens[0]?.charEnd, 3);
    assert.equal(sentence.slice(tokens[0].charStart, tokens[0].charEnd), "I'd");
    assert.equal(sentence.slice(tokens[2].charStart, tokens[2].charEnd), "coffee");
    assert.equal(tokens[3]?.isWord, false);
  });

  it("uses UTF-16 half-open indexes for surrogate pairs", () => {
    const sentence = "Hi 👍!";
    const tokens = alignTokens(
      sentence,
      [
        { surface: "Hi", lemma: "hi", pos: "X", isWord: true },
        { surface: "👍", lemma: "👍", pos: "X", isWord: false },
        { surface: "!", lemma: "!", pos: "PUNCT", isWord: false }
      ],
      "s0"
    );
    assert.equal(tokens[1]?.charStart, 3);
    assert.equal(tokens[1]?.charEnd, 5);
    assert.equal(sentence.slice(tokens[1].charStart, tokens[1].charEnd), "👍");
  });

  it("retokenizes with regex when a surface cannot be aligned", () => {
    const sentence = "Hello there.";
    const tokens = alignTokens(sentence, [{ surface: "Nope", lemma: "nope", pos: "X", isWord: true }], "s0");
    assert.ok(tokens.length >= 2);
    assert.ok(tokens.every((token) => token.charStart >= 0));
    assert.equal(sentence.slice(tokens[0].charStart, tokens[0].charEnd), tokens[0].surface);
  });
});

describe("regexRetokenize", () => {
  it("keeps apostrophes inside words", () => {
    const tokens = regexRetokenize("It's fine.", "s1");
    assert.equal(tokens[0]?.surface, "It's");
    assert.equal(tokens[0]?.isWord, true);
  });
});

describe("buildSentences", () => {
  it("drops empty sentences and assigns ids", () => {
    const sentences = buildSentences([
      { text: "Hi.", tokens: [{ surface: "Hi", lemma: "hi", pos: "X", isWord: true }] },
      { text: "   " }
    ]);
    assert.equal(sentences.length, 1);
    assert.equal(sentences[0]?.id, "s0");
    assert.equal(sentences[0]?.tokens[0]?.id, "s0_t0");
  });
});
