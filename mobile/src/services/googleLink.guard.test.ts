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

  it("uses the Expo Go experience redirect, not didao:// or localhost", () => {
    const hook = readFileSync(new URL("../hooks/useGoogleBind.ts", import.meta.url), "utf8");
    const redirect = readFileSync(new URL("./googleRedirect.ts", import.meta.url), "utf8");
    assert.match(hook, /googleRedirectUriOptions/);
    assert.doesNotMatch(hook, /preferLocalhost/);
    assert.doesNotMatch(hook, /scheme:\s*["']didao["']/);
    assert.match(redirect, /path: "oauthredirect"/);
    assert.doesNotMatch(redirect, /preferLocalhost/);
    assert.doesNotMatch(redirect, /scheme:/);
  });

  it("marks an SRS cloud write miss as error so 未同步到云 can show", () => {
    const source = readFileSync(new URL("./wordbook.ts", import.meta.url), "utf8");
    assert.match(source, /updateWordbookSrs/);
    assert.match(source, /syncState: "error" as const/);
  });
});
