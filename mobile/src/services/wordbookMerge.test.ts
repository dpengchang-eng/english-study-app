import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WordbookItem } from "../types";
import { mergeWordbook, mergeWordbookItems } from "./wordbookMerge";

function item(partial: Partial<WordbookItem> & Pick<WordbookItem, "id" | "phrase">): WordbookItem {
  return {
    ipa: "",
    senses: [],
    sentenceContext: partial.phrase,
    conversionId: "local",
    blankStart: 0,
    blankEnd: partial.phrase.length,
    createdAt: 1,
    dueAt: 1,
    box: 0,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState: "synced",
    ...partial
  };
}

describe("mergeWordbookItems", () => {
  it("keeps a local unsynced word when remote already has due items", () => {
    const remote = [item({ id: "dinner", phrase: "dinner", syncState: "synced" })];
    const local = [item({ id: "grab-coffee", phrase: "grab coffee", syncState: "pending" })];
    const merged = mergeWordbookItems(local, remote);
    assert.deepEqual(
      merged.map((row) => row.id).sort(),
      ["dinner", "grab-coffee"]
    );
  });

  it("prefers the local pending row over the same remote id", () => {
    const remote = [item({ id: "dinner", phrase: "dinner", reviewCount: 0, syncState: "synced", dueAt: 9 })];
    const local = [item({ id: "dinner", phrase: "dinner", reviewCount: 2, syncState: "pending" })];
    const merged = mergeWordbookItems(local, remote);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.reviewCount, 2);
    assert.equal(merged[0]?.syncState, "pending");
  });

  it("lets cloud win when local is already synced and not ahead", () => {
    const local = [item({ id: "dinner", phrase: "dinner", syncState: "synced", dueAt: 1 })];
    const remote = [item({ id: "dinner", phrase: "dinner", syncState: "synced", dueAt: 9 })];
    const merged = mergeWordbook(local, remote);
    assert.equal(merged[0]?.dueAt, 9);
  });

  it("keeps local error rows", () => {
    const local = [item({ id: "family", phrase: "family", syncState: "error" })];
    const remote = [item({ id: "family", phrase: "family", syncState: "synced", dueAt: 9 })];
    const merged = mergeWordbook(local, remote);
    assert.equal(merged.find((row) => row.id === "family")?.syncState, "error");
  });
});
