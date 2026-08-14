import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("googleLink", () => {
  it("links the current user and never signs in a new uid", () => {
    const source = readFileSync(new URL("./googleLink.ts", import.meta.url), "utf8");
    assert.match(source, /linkWithCredential/);
    assert.match(source, /linkWithPopup/);
    assert.doesNotMatch(source, /signInWithCredential/);
    assert.doesNotMatch(source, /signInWithPopup/);
    assert.doesNotMatch(source, /signInWithRedirect/);
  });
});
