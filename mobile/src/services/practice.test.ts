import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blankParts, resolveBlankSpan } from "./blank";

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
