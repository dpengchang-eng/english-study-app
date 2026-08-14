import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGeminiJson } from "./geminiParse";

const USER_SENTENCE = "我准备去运动一下，然后运动，一边运动一边学英语";
const REWRITE =
  "I'm gonna go work out for a bit, then keep moving — work out and learn English at the same time.";

describe("parseGeminiJson", () => {
  it("stitches outputText from sentence.text when the field is missing", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        sourceLang: "zh",
        sentences: [{ text: "I'm gonna go work out for a bit." }, { text: "Then I'll learn English while I do." }]
      })
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.payload.outputText, /work out/);
    assert.equal(result.payload.sentences.length, 2);
  });

  it("keeps a rewrite when sentences are missing", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        sourceLang: "zh",
        outputText: REWRITE
      })
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payload.outputText, REWRITE);
    assert.equal(result.payload.sentences[0]?.text, REWRITE);
  });

  it("reads sentence strings and english keys", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        sourceLang: "zh",
        sentences: ["I'm heading out to work out.", { english: "I'll learn English while I exercise." }]
      })
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payload.sentences.length, 2);
    assert.match(result.payload.outputText, /work out/);
  });

  it("extracts JSON wrapped in prose or fences", () => {
    const inner = JSON.stringify({
      sourceLang: "zh",
      outputText: REWRITE,
      sentences: [{ text: REWRITE }]
    });
    const fenced = parseGeminiJson("```json\n" + inner + "\n```");
    const wrapped = parseGeminiJson("Sure.\n" + inner + "\nThanks.");
    assert.equal(fenced.ok, true);
    assert.equal(wrapped.ok, true);
  });

  it("does not fail this user sentence just because outputText is omitted", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        sourceLang: "zh",
        sentences: [
          { text: "I'm gonna go work out for a bit." },
          { text: "Then I'll keep moving and learn English while I work out." }
        ]
      })
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.payload.outputText.length > 0);
    assert.ok(USER_SENTENCE.includes("运动"));
  });

  it("returns parse_error when nothing usable is present", () => {
    const result = parseGeminiJson("not json at all");
    assert.deepEqual(result, { ok: false, errorCode: "parse_error" });
  });
});
