import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Conversion } from "../types";
import { applyConversionSync, applyConvertResult, mergeRemoteRecents } from "./history";

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

  it("keeps the first createdAt when a retry result comes back", () => {
    const loading = row({ id: "a", clientRequestId: "r2", status: "loading", createdAt: 10, attemptedAt: 99 });
    const ready = row({
      id: "a",
      clientRequestId: "r2",
      status: "ready",
      createdAt: 99,
      outputText: "Free this weekend?"
    });
    const next = applyConvertResult([loading], ready);
    assert.equal(next[0]?.createdAt, 10);
    assert.equal(next[0]?.status, "ready");
  });

  it("ignores a stale result after retry issued a new clientRequestId", () => {
    const loading = row({ id: "a", clientRequestId: "r2", status: "loading" });
    const stale = row({ id: "a", clientRequestId: "r1", status: "failed", errorCode: "gemini_timeout" });
    const next = applyConvertResult([loading], stale);
    assert.equal(next[0]?.status, "loading");
    assert.equal(next[0]?.clientRequestId, "r2");
  });
});

describe("applyConversionSync", () => {
  it("marks a ready row unsynced without changing status", () => {
    const ready = row({ id: "a", clientRequestId: "r1", status: "ready", outputText: "ok" });
    const next = applyConversionSync([ready], "a", "r1", "error");
    assert.equal(next[0]?.status, "ready");
    assert.equal(next[0]?.syncState, "error");
    assert.equal(next[0]?.outputText, "ok");
  });

  it("ignores a stale retry id", () => {
    const ready = row({ id: "a", clientRequestId: "r2", status: "ready", outputText: "ok" });
    const next = applyConversionSync([ready], "a", "r1", "error");
    assert.equal(next[0]?.syncState, undefined);
  });
});

describe("mergeRemoteRecents", () => {
  it("keeps a local loading row and a local unsynced ready row", () => {
    const loading = row({ id: "a", clientRequestId: "r2", status: "loading", createdAt: 3 });
    const localReady = row({
      id: "b",
      clientRequestId: "r1",
      status: "ready",
      syncState: "error",
      createdAt: 2,
      outputText: "local"
    });
    const remoteReady = row({
      id: "c",
      clientRequestId: "r0",
      status: "ready",
      syncState: "synced",
      createdAt: 1,
      outputText: "cloud"
    });
    const next = mergeRemoteRecents([loading, localReady], [remoteReady]);
    assert.equal(next.find((item) => item.id === "a")?.status, "loading");
    assert.equal(next.find((item) => item.id === "b")?.syncState, "error");
    assert.equal(next.find((item) => item.id === "c")?.outputText, "cloud");
  });

  it("lets a remote ready cover a local failed row with the same id", () => {
    const failed = row({ id: "a", clientRequestId: "r1", status: "failed", errorCode: "gemini_timeout" });
    const ready = row({ id: "a", clientRequestId: "r1", status: "ready", outputText: "late", syncState: "synced" });
    const next = mergeRemoteRecents([failed], [ready]);
    assert.equal(next[0]?.status, "ready");
    assert.equal(next[0]?.outputText, "late");
  });
});
