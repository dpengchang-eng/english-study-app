import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapGoogleLinkError } from "./googleLinkErrors";

describe("mapGoogleLinkError", () => {
  it("explains when the Google account already belongs to another uid", () => {
    const result = mapGoogleLinkError({ code: "auth/credential-already-in-use" });
    assert.equal(result.ok, false);
    assert.match(result.message, /已绑定其他用户/);
    assert.match(result.message, /词本还在/);
  });

  it("treats a closed popup as cancel, not a uid switch", () => {
    const result = mapGoogleLinkError({ code: "auth/popup-closed-by-user" });
    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
  });
});
