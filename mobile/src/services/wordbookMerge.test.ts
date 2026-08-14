import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WordbookItem } from "../types";
import { mergeWordbook } from "./wordbookMerge";

function item(id: string, syncState: WordbookItem["syncState"], dueAt = 1): WordbookItem {
  return {
    id,
    phrase: id,
    ipa: "",
    senses: [],
    sentenceContext: id,
    conversionId: "local",
    blankStart: 0,
    blankEnd: id.length,
    createdAt: 1,
    dueAt,
    box: 0,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState
  };
}

describe("mergeWordbook", () => {
  it("keeps local pending and error rows when cloud also has that id", () => {
    const local = [item("dinner", "pending"), item("family", "error")];
    const remote = [item("dinner", "synced", 9), item("family", "synced", 9)];
    const merged = mergeWordbook(local, remote);
    assert.equal(merged.find((row) => row.id === "dinner")?.syncState, "pending");
    assert.equal(merged.find((row) => row.id === "family")?.syncState, "error");
  });

  it("keeps local-only pending rows and adds cloud-only rows", () => {
    const local = [item("local-only", "pending")];
    const remote = [item("cloud-only", "synced")];
    const merged = mergeWordbook(local, remote);
    assert.deepEqual(
      merged.map((row) => row.id).sort(),
      ["cloud-only", "local-only"]
    );
  });

  it("lets cloud win when local is already synced", () => {
    const local = [item("dinner", "synced", 1)];
    const remote = [item("dinner", "synced", 9)];
    const merged = mergeWordbook(local, remote);
    assert.equal(merged[0]?.dueAt, 9);
  });
});
