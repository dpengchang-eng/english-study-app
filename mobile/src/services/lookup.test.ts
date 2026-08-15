import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipLookup, lookupPhrase, parseLookupResult, type LookupResult } from "./lookup";

describe("LookupResult", () => {
  it("includes simpleEn on local cache hits", async () => {
    const result: LookupResult = await lookupPhrase("coffee", "coffee");
    assert.equal(typeof result.simpleEn, "string");
    assert.ok(result.simpleEn.length > 0);
    assert.ok(result.senses.includes("咖啡"));
    assert.equal("simpleEn" in result, true);
  });

  it("keeps Chinese when simpleEn is missing and fills an empty string", () => {
    const parsed = parseLookupResult({ ipa: "/ɡræb/", senses: ["随手拿", "抓住"] });
    assert.ok(parsed);
    assert.deepEqual(parsed.senses, ["随手拿", "抓住"]);
    assert.equal(parsed.simpleEn, "");
    const clipped = clipLookup(parsed);
    assert.equal(clipped.simpleEn, "");
    assert.equal(clipLookup({ ipa: "", senses: ["中文"], simpleEn: "  take it  " }).simpleEn, "take it");
  });

  it("reads simpleEn from Gemini-shaped JSON", () => {
    const parsed = parseLookupResult({
      ipa: "/ˈkɔfi/",
      senses: ["咖啡"],
      simpleEn: "a hot drink from coffee beans"
    });
    assert.ok(parsed);
    assert.equal(parsed.simpleEn, "a hot drink from coffee beans");
    assert.equal(parseLookupResult({ ipa: "", senses: [] }), null);
  });
});
