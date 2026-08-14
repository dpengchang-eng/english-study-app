import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptedAnswers, answerFromSources, isCorrectGuess } from "./practiceGrade";

describe("acceptedAnswers", () => {
  it("does not accept one word from a multi-word phrase", () => {
    const accepted = acceptedAnswers("grab coffee", "grab-coffee");
    assert.deepEqual(accepted, ["grab coffee"]);
    assert.equal(isCorrectGuess("grab", accepted, "grab coffee"), false);
    assert.equal(isCorrectGuess("coffee", accepted, "grab coffee"), false);
    assert.equal(isCorrectGuess("grab coffee", accepted, "grab coffee"), true);
  });

  it("accepts a single word and a one-letter typo on long words", () => {
    const accepted = acceptedAnswers("dinner", "dinner");
    assert.equal(isCorrectGuess("dinner", accepted, "dinner"), true);
    assert.equal(isCorrectGuess("diner", accepted, "dinner"), true);
  });
});

describe("answerFromSources", () => {
  it("grades from the persisted key when memory is empty", () => {
    const row = answerFromSources(undefined, { expected: "grab coffee", accepted: ["grab coffee"] }, undefined);
    assert.ok(row);
    assert.equal(isCorrectGuess("grab coffee", row.accepted, row.expected), true);
    assert.equal(isCorrectGuess("coffee", row.accepted, row.expected), false);
  });

  it("falls back to the wordbook phrase after a process kill", () => {
    const row = answerFromSources(undefined, undefined, { id: "grab-coffee", phrase: "grab coffee" });
    assert.ok(row);
    assert.equal(isCorrectGuess("grab coffee", row.accepted, row.expected), true);
    assert.equal(isCorrectGuess("grab", row.accepted, row.expected), false);
  });
});
