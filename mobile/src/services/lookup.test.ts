import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupForSave, shouldRememberLookup } from "./lookup";
import { asLookup, emptyLookup, lookupCacheKey, oneLineSimpleEn } from "./lookupParse";

describe("lookupWord / geminiLookup result", () => {
  it("returns ipa, up to 3 Chinese senses, and simpleEn", () => {
    const result = asLookup({
      ipa: "/ˈkɔfi/",
      senses: ["咖啡", "咖啡豆", "咖啡色", "多余"],
      simpleEn: "Coffee is a hot drink."
    });
    assert.equal(result.ipa, "/ˈkɔfi/");
    assert.deepEqual(result.senses, ["咖啡", "咖啡豆", "咖啡色"]);
    assert.equal(result.simpleEn, "Coffee is a hot drink.");
  });

  it("pins simpleEn to one line", () => {
    assert.equal(oneLineSimpleEn("Coffee is a hot drink.\nIt is brown."), "Coffee is a hot drink. It is brown.");
    assert.equal(asLookup({ ipa: "", senses: ["咖啡"], simpleEn: "One line.\nTwo." }).simpleEn, "One line. Two.");
  });

  it("keys the lookup cache by surface and sentenceContext", () => {
    const coffeeHere = lookupCacheKey({
      lemma: "coffee",
      surface: "coffee",
      sentenceContext: "I like coffee."
    });
    const coffeeThere = lookupCacheKey({
      lemma: "coffee",
      surface: "coffee",
      sentenceContext: "Grab coffee later."
    });
    assert.match(coffeeHere, /i like coffee\./);
    assert.notEqual(coffeeHere, coffeeThere);
  });

  it("does not remember a failed empty lookup", () => {
    assert.equal(shouldRememberLookup(emptyLookup()), false);
    assert.equal(shouldRememberLookup({ ipa: "", senses: [], simpleEn: "" }), false);
    assert.equal(shouldRememberLookup({ ipa: "/x/", senses: [], simpleEn: "" }), true);
    assert.equal(shouldRememberLookup({ ipa: "", senses: ["咖啡"], simpleEn: "" }), true);
  });

  it("returns a result even when senses and simpleEn are empty", () => {
    const empty = asLookup({ ipa: "", senses: [], simpleEn: "" });
    assert.deepEqual(empty, { ipa: "", senses: [], simpleEn: "" });
    assert.deepEqual(asLookup(null), emptyLookup());
    assert.deepEqual(asLookup("nope"), emptyLookup());
  });

  it("lookupForSave waits for the in-flight lookup instead of saving empty fields", async () => {
    const pending = Promise.resolve({
      ipa: "/ˈkɔfi/",
      senses: ["咖啡"],
      simpleEn: "Coffee is a hot drink.\nMore."
    });
    const result = await lookupForSave(
      { lemma: "coffee", surface: "coffee", sentenceContext: "I like coffee." },
      pending
    );
    assert.equal(result.ipa, "/ˈkɔfi/");
    assert.deepEqual(result.senses, ["咖啡"]);
    assert.equal(result.simpleEn, "Coffee is a hot drink. More.");
  });

  it("lookupForSave still returns empty fields when lookup fails", async () => {
    const pending = Promise.reject(new Error("lookup_failed"));
    const result = await lookupForSave({ lemma: "zzz", surface: "zzz", sentenceContext: "" }, pending);
    assert.deepEqual(result, emptyLookup());
  });
});
