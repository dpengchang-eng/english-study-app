import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expoSpeechRate,
  nextSpeechSpeed,
  parseSpeechSpeed,
  speechSpeedLabel,
  SPEECH_SPEEDS
} from "./speechSpeed";

describe("speech speed", () => {
  it("cycles 0.75x → 1x → 1.25x → 1.5x → 0.75x", () => {
    assert.deepEqual(SPEECH_SPEEDS, [0.75, 1, 1.25, 1.5]);
    assert.equal(nextSpeechSpeed(0.75), 1);
    assert.equal(nextSpeechSpeed(1), 1.25);
    assert.equal(nextSpeechSpeed(1.25), 1.5);
    assert.equal(nextSpeechSpeed(1.5), 0.75);
  });

  it("defaults unknown values to 1x", () => {
    assert.equal(parseSpeechSpeed(1), 1);
    assert.equal(parseSpeechSpeed("1.25"), 1.25);
    assert.equal(parseSpeechSpeed(2), 1);
    assert.equal(parseSpeechSpeed("nope"), 1);
  });

  it("maps multipliers so both iOS and Android get slower and faster than 1x", () => {
    for (const os of ["ios", "android"] as const) {
      assert.ok(expoSpeechRate(0.75, os) < expoSpeechRate(1, os));
      assert.ok(expoSpeechRate(1.25, os) > expoSpeechRate(1, os));
      assert.ok(expoSpeechRate(1.5, os) > expoSpeechRate(1.25, os));
    }
    assert.equal(expoSpeechRate(1, "ios"), expoSpeechRate(1, "android"));
  });

  it("shows 语速 with the current multiplier", () => {
    assert.equal(speechSpeedLabel(1), "语速 1x");
    assert.equal(speechSpeedLabel(0.75), "语速 0.75x");
    assert.equal(speechSpeedLabel(1.25), "语速 1.25x");
    assert.equal(speechSpeedLabel(1.5), "语速 1.5x");
  });
});
