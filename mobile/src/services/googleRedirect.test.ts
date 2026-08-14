import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googleRedirectUriOptions } from "./googleRedirect";

describe("googleRedirectUriOptions", () => {
  it("only sets the Expo Go path", () => {
    assert.deepEqual(googleRedirectUriOptions(), { path: "oauthredirect" });
  });
});
