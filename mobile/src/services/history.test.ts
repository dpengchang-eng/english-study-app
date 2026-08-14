import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Conversion } from "../types";
import { applyConvertResult } from "./history";

function row(partial: Partial<Conversion> & Pick<Conversion, "id" | "status" | "clientRequestId">): Conversion {
  return {
    sourceText: "我准备去运动一下，然后运动，一边运动一边学英语",
    sourceType: "text",
    sentences: [],
    createdAt: 1,
    ...partial
  };
}

describe("applyConvertResult", () => {
  it("lets a late ready replace the same-request failed row", () => {
    const failed = row({ id: "a", clientRequestId: "r1", status: "failed", errorCode: "gemini_timeout" });
    const ready = row({
      id: "a",
      clientRequestId: "r1",
      status: "ready",
      outputText: "I'm gonna go work out.",
      sentences: [{ id: "s0", text: "I'm gonna go work out." }]
    });
    const next = applyConvertResult([failed], ready);
    assert.equal(next[0]?.status, "ready");
    assert.equal(next[0]?.outputText, "I'm gonna go work out.");
  });

  it("does not downgrade a ready row with a late timeout", () => {
    const ready = row({ id: "a", clientRequestId: "r1", status: "ready", outputText: "ok" });
    const failed = row({ id: "a", clientRequestId: "r1", status: "failed", errorCode: "gemini_timeout" });
    const next = applyConvertResult([ready], failed);
    assert.equal(next[0]?.status, "ready");
    assert.equal(next[0]?.outputText, "ok");
  });

  it("ignores a stale result after retry issued a new clientRequestId", () => {
    const loading = row({ id: "a", clientRequestId: "r2", status: "loading" });
    const stale = row({ id: "a", clientRequestId: "r1", status: "failed", errorCode: "gemini_timeout" });
    const next = applyConvertResult([loading], stale);
    assert.equal(next[0]?.status, "loading");
    assert.equal(next[0]?.clientRequestId, "r2");
  });
});
