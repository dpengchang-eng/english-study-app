import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("listen tts", () => {
  it("keeps expo-speech American English and does not add speech recognition", () => {
    const tts = readFileSync(new URL("./tts.ts", import.meta.url), "utf8");
    const pkg = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
    assert.match(tts, /expo-speech/);
    assert.match(tts, /language:\s*"en-US"/);
    assert.match(tts, /Speech\.stop/);
    assert.doesNotMatch(tts, /expo-speech-recognition/);
    assert.doesNotMatch(pkg, /expo-speech-recognition/);
  });

  it("locks the result row to 听全文 | 复读 with 这句 / 全文", () => {
    const result = readFileSync(new URL("../screens/ResultScreen.tsx", import.meta.url), "utf8");
    const list = readFileSync(new URL("../components/SentenceList.tsx", import.meta.url), "utf8");
    const hook = readFileSync(new URL("../hooks/useArticleSpeech.ts", import.meta.url), "utf8");
    assert.match(result, /听全文/);
    assert.match(result, /复读/);
    assert.match(result, /这句/);
    assert.match(result, /全文/);
    assert.match(result, /停止/);
    assert.match(result, /listenPipe/);
    assert.match(list, />听</);
    assert.match(list, /playingId/);
    assert.match(list, /cardOn/);
    assert.match(hook, /useFocusEffect/);
    assert.match(hook, /AppState/);
    assert.match(hook, /stopSpeaking/);
    assert.match(result, /stop\(\);\s*setPicked\(null\);\s*openLookup/s);
    assert.doesNotMatch(result, /单句循环/);
    assert.doesNotMatch(result, /全文循环/);
    assert.doesNotMatch(result, /expo-speech-recognition/);
    assert.doesNotMatch(result, /SENTENCE_CAP/);
  });
});
