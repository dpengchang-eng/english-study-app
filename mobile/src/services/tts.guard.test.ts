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

  it("keeps 听全文 | 复读 on top and 听 + 循环 on each sentence", () => {
    const tts = readFileSync(new URL("./tts.ts", import.meta.url), "utf8");
    const result = readFileSync(new URL("../screens/ResultScreen.tsx", import.meta.url), "utf8");
    const list = readFileSync(new URL("../components/SentenceList.tsx", import.meta.url), "utf8");
    const hook = readFileSync(new URL("../hooks/useArticleSpeech.ts", import.meta.url), "utf8");
    const planner = readFileSync(new URL("./articleSpeech.ts", import.meta.url), "utf8");
    assert.match(result, /听全文/);
    assert.match(result, /复读/);
    assert.match(result, /停止/);
    assert.match(result, /listenPipe/);
    assert.match(result, /toggle\("loopAll"\)/);
    assert.match(result, /onLoop/);
    assert.match(list, /听/);
    assert.match(list, /循环/);
    assert.match(list, /停止/);
    assert.match(list, /playingId/);
    assert.match(list, /cardOn/);
    assert.match(hook, /useFocusEffect/);
    assert.match(hook, /AppState/);
    assert.match(hook, /stopSpeaking/);
    assert.match(hook, /loopOne/);
    assert.match(hook, /modeRef/);
    assert.match(hook, /decideListenAction/);
    assert.match(hook, /getCurrentRoute/);
    assert.match(hook, /Lookup/);
    assert.doesNotMatch(hook, /stopSpeaking\(\);\s*speakAt/);
    assert.match(planner, /loopOne/);
    assert.match(planner, /decideListenAction/);
    assert.match(planner, /revealScrollY/);
    assert.match(tts, /onStart/);
    assert.match(tts, /speechWanted/);
    assert.match(tts, /shouldStop/);
    assert.match(result, /SPEAK_EMPTY_TEXT/);
    assert.match(result, /revealScrollY/);
    assert.match(result, /scrollTo/);
    assert.match(result, /stop\(\);\s*setPicked\(null\);\s*openLookup/s);
    assert.match(list, /onSentenceLayout/);
    assert.doesNotMatch(result, /这句/);
    assert.doesNotMatch(list, /这句/);
    assert.doesNotMatch(result, /单句循环/);
    assert.doesNotMatch(result, /expo-speech-recognition/);
    assert.doesNotMatch(result, /SENTENCE_CAP/);
  });
});
