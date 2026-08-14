import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSentences, ensureTappableTokens, regexRetokenize } from "./align";

const dinner = "I went out for dinner with my family tonight.";

describe("regexRetokenize", () => {
  it("marks English words as tappable", () => {
    const tokens = regexRetokenize(dinner, "s0");
    const words = tokens.filter((token) => token.isWord).map((token) => token.surface);
    assert.deepEqual(words, ["I", "went", "out", "for", "dinner", "with", "my", "family", "tonight"]);
    assert.equal(tokens.at(-1)?.surface, ".");
    assert.equal(tokens.at(-1)?.isWord, false);
  });
});

describe("ensureTappableTokens", () => {
  it("splits sentence.text when tokens are missing", () => {
    const tokens = ensureTappableTokens({ id: "s0", text: dinner });
    assert.ok(tokens.some((token) => token.isWord && token.surface === "dinner"));
  });

  it("treats alphanumeric surfaces as words when Gemini marks none", () => {
    const tokens = ensureTappableTokens({
      id: "s0",
      text: dinner,
      tokens: [
        { id: "s0_t0", lemma: "i", surface: "I", isWord: false },
        { id: "s0_t1", lemma: "go", surface: "went", isWord: false },
        { id: "s0_t2", lemma: ".", surface: ".", isWord: false }
      ]
    });
    assert.equal(tokens[0]?.isWord, true);
    assert.equal(tokens[1]?.isWord, true);
    assert.equal(tokens[2]?.isWord, false);
  });

  it("retokenizes when no token is a word", () => {
    const tokens = ensureTappableTokens({
      id: "s0",
      text: dinner,
      tokens: [{ id: "s0_t0", lemma: "", surface: "—", isWord: false }]
    });
    assert.ok(tokens.some((token) => token.surface === "dinner" && token.isWord));
  });
});

describe("buildSentences", () => {
  it("retokenizes when Gemini omits tokens", () => {
    const sentences = buildSentences([{ text: dinner }]);
    assert.ok(sentences[0]?.tokens.some((token) => token.isWord && token.surface === "family"));
  });

  it("marks wordish surfaces when Gemini omits isWord", () => {
    const sentences = buildSentences([
      {
        text: "Hello there.",
        tokens: [
          { surface: "Hello", lemma: "hello", pos: "X" },
          { surface: "there", lemma: "there", pos: "X" },
          { surface: ".", lemma: ".", pos: "PUNCT" }
        ]
      }
    ]);
    assert.equal(sentences[0]?.tokens[0]?.isWord, true);
    assert.equal(sentences[0]?.tokens[1]?.isWord, true);
    assert.equal(sentences[0]?.tokens[2]?.isWord, false);
  });
});
