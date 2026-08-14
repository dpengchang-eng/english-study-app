import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanInput } from "./clean";

describe("cleanInput", () => {
  it("trims text and keeps a valid request", () => {
    const result = cleanInput({
      text: "  你好  ",
      sourceType: "text",
      sourceLangHint: "zh",
      clientRequestId: "req-1"
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.text, "你好");
  });

  it("rejects empty text", () => {
    const result = cleanInput({ text: "   ", sourceType: "voice", clientRequestId: "req-1" });
    assert.deepEqual(result, { ok: false, errorCode: "input_empty" });
  });

  it("rejects text over 2000 characters", () => {
    const result = cleanInput({
      text: "a".repeat(2001),
      sourceType: "text",
      clientRequestId: "req-1"
    });
    assert.deepEqual(result, { ok: false, errorCode: "input_too_long" });
  });

  it("rejects a bad sourceType or missing clientRequestId", () => {
    assert.equal(cleanInput({ text: "hi", sourceType: "chat", clientRequestId: "x" }).ok, false);
    assert.equal(cleanInput({ text: "hi", sourceType: "text" }).ok, false);
  });
});
