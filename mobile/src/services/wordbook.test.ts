import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Token } from "../types";
import { PHRASE_MAX, SENTENCE_CONTEXT_MAX } from "../types";
import {
  consecutiveTokenSpan,
  EMPTY_SELECTION,
  selectWordTokens,
  wordbookDraftFromSelection
} from "./wordbookSelect";

const sentence = "I'd like to grab coffee with you sometime — does that work for you?";

function tokensFrom(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\s]/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(text)) !== null) {
    const surface = match[0];
    tokens.push({
      id: `s0_t${index}`,
      lemma: surface.toLowerCase(),
      surface,
      isWord: /[A-Za-z0-9]/.test(surface),
      charStart: match.index,
      charEnd: match.index + surface.length
    });
    index += 1;
  }
  return tokens;
}

function words(tokens: Token[]): Token[] {
  return tokens.filter((token) => token.isWord);
}

describe("saveToWordbook selection", () => {
  const tokens = tokensFrom(sentence);

  it("saves a 7+ word span and blanks that exact selection", () => {
    const seven = words(tokens).slice(0, 7);
    assert.ok(seven.length >= 7);
    const draft = wordbookDraftFromSelection({
      tokens: seven,
      sentenceTokens: tokens,
      sentenceText: sentence,
      conversionId: "c1",
      ipa: "",
      senses: ["喜欢约咖啡"],
      simpleEn: "This is about meeting for coffee."
    });
    assert.equal(draft.phrase, "I'd like to grab coffee with you");
    assert.equal(sentence.slice(draft.blankStart, draft.blankEnd), draft.phrase);
    assert.equal(draft.simpleEn, "This is about meeting for coffee.");
    assert.ok(draft.lemmaKey);
  });

  it("pins saved simpleEn to one line", () => {
    const draft = wordbookDraftFromSelection({
      tokens: words(tokens).slice(3, 5),
      sentenceTokens: tokens,
      sentenceText: sentence,
      conversionId: "c1",
      ipa: "",
      senses: ["随手拿"],
      simpleEn: "Grab coffee quickly.\nA second line."
    });
    assert.equal(draft.simpleEn, "Grab coffee quickly.");
  });

  it("saves a whole-sentence span, including punctuation, as one cloze blank", () => {
    const allWords = words(tokens);
    const draft = wordbookDraftFromSelection({
      tokens: [allWords[0], allWords[allWords.length - 1]],
      sentenceTokens: tokens,
      sentenceText: sentence,
      conversionId: "c1",
      ipa: "",
      senses: [],
      simpleEn: ""
    });
    assert.equal(draft.phrase, sentence);
    assert.equal(draft.blankStart, 0);
    assert.equal(draft.blankEnd, sentence.length);
    assert.equal(sentence.slice(draft.blankStart, draft.blankEnd), sentence);
    assert.ok(selectWordTokens(allWords, tokens).some((token) => token.surface === "?"));
  });

  it("rejects only an empty selection", () => {
    assert.throws(() => selectWordTokens([], tokens), { message: EMPTY_SELECTION });
    assert.throws(
      () =>
        wordbookDraftFromSelection({
          tokens: [],
          sentenceTokens: tokens,
          sentenceText: sentence,
          conversionId: "c1",
          ipa: "",
          senses: []
        }),
      { message: EMPTY_SELECTION }
    );
  });

  it("keeps a long phrase up to the sentenceContext cap, not 180", () => {
    assert.equal(PHRASE_MAX, SENTENCE_CONTEXT_MAX);
    assert.equal(PHRASE_MAX, 760);
    const draft = wordbookDraftFromSelection({
      tokens: words(tokens),
      sentenceTokens: tokens,
      sentenceText: sentence,
      conversionId: "c1",
      ipa: "",
      senses: []
    });
    assert.ok(draft.phrase.length > 40);
    assert.ok(draft.phrase.length <= PHRASE_MAX);
  });

  it("does not reset SRS fields when the same slug already exists", () => {
    const draft = wordbookDraftFromSelection({
      tokens: words(tokens).slice(3, 5),
      sentenceTokens: tokens,
      sentenceText: sentence,
      conversionId: "c1",
      ipa: "/ɡræb/",
      senses: ["随手拿"]
    });
    const existing = {
      id: draft.lemmaKey,
      dueAt: 9_999,
      box: 2 as const,
      intervalDays: 3 as const,
      reviewCount: 4
    };
    assert.equal(existing.id, draft.lemmaKey);
    assert.equal(existing.dueAt, 9_999);
    assert.equal(existing.box, 2);
  });
});

describe("consecutiveTokenSpan", () => {
  const tokens = tokensFrom(sentence);

  it("lets a long-press span cover 7+ words and the whole sentence", () => {
    const all = words(tokens);
    const seven = consecutiveTokenSpan(tokens, all[0], all[6]);
    assert.ok(seven);
    assert.ok(seven.filter((token) => token.isWord).length >= 7);
    const whole = consecutiveTokenSpan(tokens, all[0], all[all.length - 1]);
    assert.ok(whole);
    assert.equal(whole[0]?.surface, "I'd");
    assert.equal(whole.at(-1)?.surface, "?");
  });
});

describe("1-6 error copy is gone", () => {
  it("does not mention the old 1 to 6 word cap", () => {
    const files = [
      readFileSync(new URL("./wordbook.ts", import.meta.url), "utf8"),
      readFileSync(new URL("./wordbookSelect.ts", import.meta.url), "utf8"),
      readFileSync(new URL("../screens/LookupScreen.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("../screens/ResultScreen.tsx", import.meta.url), "utf8")
    ];
    for (const source of files) {
      assert.doesNotMatch(source, /只能存 1 到 6 个连续单词/);
      assert.doesNotMatch(source, /to - from \+ 1 > 6/);
    }
  });
});
