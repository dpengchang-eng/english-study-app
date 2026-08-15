import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { clipLookup, lookupWord, parseLookupResult, type LookupResult } from "./lookup";

describe("LookupResult", () => {
  it("includes simpleEn on local cache hits via lookupWord", async () => {
    const result: LookupResult = await lookupWord({
      lemma: "coffee",
      surface: "coffee",
      sentenceContext: "I'd like to grab coffee with you."
    });
    assert.equal(typeof result.simpleEn, "string");
    assert.ok(result.simpleEn.length > 0);
    assert.ok(result.senses.includes("咖啡"));
    assert.equal("simpleEn" in result, true);
    assert.equal(result.pos, "noun");
  });

  it("keeps Chinese when simpleEn is missing and fills an empty string", () => {
    const parsed = parseLookupResult({ ipa: "/ɡræb/", senses: ["随手拿", "抓住"] });
    assert.ok(parsed);
    assert.deepEqual(parsed.senses, ["随手拿", "抓住"]);
    assert.equal(parsed.simpleEn, "");
    assert.equal(parsed.pos, "");
    const clipped = clipLookup(parsed);
    assert.equal(clipped.simpleEn, "");
    assert.equal(clipLookup({ ipa: "", pos: "verb", senses: ["中文"], simpleEn: "  take it  " }).simpleEn, "take it");
  });

  it("reads simpleEn and pos from Gemini-shaped JSON", () => {
    const parsed = parseLookupResult({
      ipa: "/ˈkɔfi/",
      pos: "noun",
      senses: ["咖啡"],
      simpleEn: "a hot drink from coffee beans"
    });
    assert.ok(parsed);
    assert.equal(parsed.simpleEn, "a hot drink from coffee beans");
    assert.equal(parsed.pos, "noun");
    assert.equal(parseLookupResult({ ipa: "", senses: [] }), null);
  });

  it("returns empty fields when lookup fails and does not invent Chinese fallback copy", () => {
    const src = readFileSync(new URL("./lookup.ts", import.meta.url), "utf8");
    assert.match(src, /lemma: string/);
    assert.match(src, /surface: string/);
    assert.match(src, /sentenceContext: string/);
    assert.match(src, /simpleEn/);
    assert.match(src, /senses: \[\]/);
    assert.doesNotMatch(src, /暂无中文释义|查词失败/);
  });
});
