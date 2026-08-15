import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const review = readFileSync(new URL("../screens/ReviewScreen.tsx", import.meta.url), "utf8");
const cloze = readFileSync(new URL("../screens/ClozeScreen.tsx", import.meta.url), "utf8");
const wordbook = readFileSync(new URL("../screens/WordbookScreen.tsx", import.meta.url), "utf8");

describe("review list is blind", () => {
  it("shows only checkbox + due label and does not show phrase, senses, simpleEn, or 听", () => {
    assert.match(review, /dueLabel/);
    assert.match(review, /accessibilityRole="checkbox"/);
    assert.match(review, /openCloze\(\[item\.id\]\)/);
    assert.match(review, /开始填空/);
    assert.match(review, /checkedItems\.map/);
    assert.doesNotMatch(review, /item\.phrase/);
    assert.doesNotMatch(review, /item\.senses/);
    assert.doesNotMatch(review, /simpleEn/);
    assert.doesNotMatch(review, /sentenceContext/);
    assert.doesNotMatch(review, /听/);
    assert.doesNotMatch(review, /queryDueWordbook/);
    assert.doesNotMatch(review, /phrase\.split/);
    assert.doesNotMatch(review, /phrase\.length/);
  });
});

describe("cloze back, reveal, and listen", () => {
  it("has 返回复习 on loading, empty, and done", () => {
    const backs = cloze.match(/返回复习/g) ?? [];
    assert.ok(backs.length >= 6, `expected 返回复习 on loading/empty/done, found ${backs.length}`);
    assert.match(cloze, /session === null/);
    assert.match(cloze, /session\.cards\.length === 0/);
    assert.match(cloze, /settled/);
    assert.match(cloze, /再练错题/);
    assert.match(cloze, /navigate\("Tabs", \{ screen: "ReviewTab" \}\)/);
  });

  it("listens to sentenceContext once at the saved speed and stops on leave", () => {
    assert.match(cloze, /currentItem\?\.sentenceContext/);
    assert.match(cloze, /speakAmerican\(\s*sentenceContext/);
    assert.match(cloze, /peekSpeechSpeed\(\)/);
    assert.match(cloze, /stopSpeaking/);
    assert.match(cloze, /AppState\.addEventListener/);
    assert.match(cloze, /useFocusEffect/);
    assert.match(cloze, /listening \? "停止" : "听"/);
    assert.match(cloze, /clozeAnswerLine/);
    assert.doesNotMatch(cloze, /听全文/);
    assert.doesNotMatch(cloze, /复读全文/);
    assert.doesNotMatch(cloze, /语速/);
    assert.doesNotMatch(cloze, /queryDueWordbook/);
    assert.doesNotMatch(cloze, /loadSpeechSpeed|speechSpeedLabel|restartCurrent/);
  });
});

describe("wordbook listen", () => {
  it("still shows phrase, has no cloze entry, and listens to phrase", () => {
    assert.match(wordbook, /item\.phrase/);
    assert.match(wordbook, /speakAmerican\(\s*item\.phrase/);
    assert.match(wordbook, /peekSpeechSpeed\(\)/);
    assert.match(wordbook, /stopSpeaking/);
    assert.match(wordbook, /AppState\.addEventListener/);
    assert.match(wordbook, /useFocusEffect/);
    assert.match(wordbook, /listening \? "停止" : "听"/);
    assert.doesNotMatch(wordbook, /openCloze/);
    assert.doesNotMatch(wordbook, /开始填空/);
    assert.doesNotMatch(wordbook, /听全文/);
    assert.doesNotMatch(wordbook, /复读全文/);
    assert.doesNotMatch(wordbook, /语速/);
    assert.doesNotMatch(wordbook, /loadSpeechSpeed|speechSpeedLabel|restartCurrent/);
  });
});
