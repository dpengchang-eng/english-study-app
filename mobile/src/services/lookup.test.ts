import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asLookup, emptyLookup } from "./lookupParse";

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

  it("returns a result even when senses and simpleEn are empty", () => {
    const empty = asLookup({ ipa: "", senses: [], simpleEn: "" });
    assert.deepEqual(empty, { ipa: "", senses: [], simpleEn: "" });
    assert.deepEqual(asLookup(null), emptyLookup());
    assert.deepEqual(asLookup("nope"), emptyLookup());
  });
});
