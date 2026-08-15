import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expoSpeechRate,
  loadSpeechSpeed,
  nextSpeechSpeed,
  parseSpeechSpeed,
  peekSpeechSpeed,
  rememberSpeechSpeed,
  resetSpeechSpeedCache,
  saveSpeechSpeed,
  shouldApplyLoadedSpeed,
  speechSpeedLabel,
  speedFromStorage,
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

  it("restores a saved multiplier and rejects unknown values", () => {
    assert.equal(speedFromStorage(null), 1);
    assert.equal(speedFromStorage(""), 1);
    assert.equal(speedFromStorage("0.75"), 0.75);
    assert.equal(speedFromStorage("1"), 1);
    assert.equal(speedFromStorage("1.25"), 1.25);
    assert.equal(speedFromStorage("1.5"), 1.5);
    assert.equal(speedFromStorage("2"), 1);
  });

  it("remembers the last choice in memory so the next screen opens on it", () => {
    resetSpeechSpeedCache();
    assert.equal(peekSpeechSpeed(), 1);
    assert.equal(rememberSpeechSpeed(1.25), 1.25);
    assert.equal(peekSpeechSpeed(), 1.25);
    assert.equal(nextSpeechSpeed(peekSpeechSpeed()), 1.5);
    resetSpeechSpeedCache();
    assert.equal(peekSpeechSpeed(), 1);
  });

  it("load-before-speak reads the persisted speed; cold peek is 1x until load", async () => {
    resetSpeechSpeedCache();
    const disk = new Map<string, string>([["didao-speech-speed-v1", "0.75"]]);
    const store = {
      getItem: async (key: string) => disk.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        disk.set(key, value);
      }
    };
    assert.equal(peekSpeechSpeed(), 1);
    const speed = await loadSpeechSpeed(store);
    assert.equal(speed, 0.75);
    assert.equal(peekSpeechSpeed(), 0.75);
    resetSpeechSpeedCache();
    const empty = {
      getItem: async () => null,
      setItem: async () => undefined
    };
    assert.equal(await loadSpeechSpeed(empty), 1);
    resetSpeechSpeedCache();
  });

  it("saves the choice and loads it back", async () => {
    resetSpeechSpeedCache();
    const disk = new Map<string, string>();
    const store = {
      getItem: async (key: string) => disk.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        disk.set(key, value);
      }
    };
    await saveSpeechSpeed(1.5, store);
    resetSpeechSpeedCache();
    assert.equal(await loadSpeechSpeed(store), 1.5);
    assert.equal(peekSpeechSpeed(), 1.5);
    resetSpeechSpeedCache();
  });

  it("ignores a late load after a tap or while speech is playing", () => {
    assert.equal(shouldApplyLoadedSpeed(true, false), false);
    assert.equal(shouldApplyLoadedSpeed(false, true), false);
    assert.equal(shouldApplyLoadedSpeed(true, true), false);
    assert.equal(shouldApplyLoadedSpeed(false, false), true);
  });

  it("does not let a late disk read overwrite a tap that already saved", async () => {
    resetSpeechSpeedCache();
    const store = {
      getItem: async () => {
        rememberSpeechSpeed(1.25);
        return "0.75";
      },
      setItem: async () => undefined
    };
    assert.equal(await loadSpeechSpeed(store), 1.25);
    assert.equal(peekSpeechSpeed(), 1.25);
    resetSpeechSpeedCache();
  });
});
