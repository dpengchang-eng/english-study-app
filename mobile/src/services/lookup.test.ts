import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLookupFailure, LOOKUP_FAIL_TEXT } from "./lookup";

describe("isLookupFailure", () => {
  it("blocks save only for the locked fail copy", () => {
    assert.equal(isLookupFailure([LOOKUP_FAIL_TEXT]), true);
    assert.equal(isLookupFailure(["查词失败，请再试一次"]), true);
    assert.equal(isLookupFailure(["暂无中文释义"]), false);
    assert.equal(isLookupFailure(["咖啡"]), false);
    assert.equal(isLookupFailure([]), false);
  });
});
