import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GOOGLE_ALREADY_USED, GOOGLE_BIND_FAIL, mapGoogleLinkError } from "./googleLinkErrors";

describe("mapGoogleLinkError", () => {
  it("uses locked copy when the Google account already belongs to another uid", () => {
    const result = mapGoogleLinkError({ code: "auth/credential-already-in-use" });
    assert.equal(result.ok, false);
    assert.equal(result.message, GOOGLE_ALREADY_USED);
    assert.equal(result.message, "这个 Google 已经用过了");
  });

  it("uses locked fail copy for other errors", () => {
    const result = mapGoogleLinkError({ code: "auth/network-request-failed" });
    assert.equal(result.message, GOOGLE_BIND_FAIL);
    assert.equal(result.message, "没绑上，再试一次");
  });

  it("treats a closed popup as cancel with no toast copy", () => {
    const result = mapGoogleLinkError({ code: "auth/popup-closed-by-user" });
    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
    assert.equal(result.message, "");
  });
});
