import type { PracticeCard } from "../types";

/** Same-width blank every time so the gap does not leak the answer length. */
export const FIXED_BLANK = "________";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAlnum(ch: string | undefined): boolean {
  return Boolean(ch && /[A-Za-z0-9]/.test(ch));
}

/** Whole word or whole selection: not a letter carved out of a longer word. */
function isWholeSpan(sentence: string, start: number, end: number): boolean {
  if (end <= start) return false;
  return !isAlnum(sentence[start - 1]) && !isAlnum(sentence[end]);
}

/** Whole-word only. No substring fallback — "a" must not hit the A in Apple. */
function findPhraseIndex(hay: string, needle: string): number {
  const escaped = escapeRegExp(needle);
  const word = new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?![A-Za-z0-9])`, "i").exec(hay);
  if (word && word[2] != null) return word.index + word[1].length;
  return -1;
}

/** Missing Gemini offsets must not become 0..phrase.length. */
export function offsetsFromTokens(tokens: Array<{ charStart?: number; charEnd?: number }>): { start: number; end: number } {
  const start = tokens[0]?.charStart;
  const end = tokens[tokens.length - 1]?.charEnd;
  if (typeof start === "number" && typeof end === "number" && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start) {
    return { start, end };
  }
  return { start: -1, end: -1 };
}

/** If saved offsets miss the phrase (Gemini tokens often lack them), find the phrase in the sentence. */
export function resolveBlankSpan(
  sentence: string,
  phrase: string,
  blankStart: number,
  blankEnd: number
): { start: number; end: number } {
  const start = Math.max(0, Math.min(blankStart, sentence.length));
  const end = Math.max(start, Math.min(blankEnd, sentence.length));
  const needle = phrase.trim();
  if (needle) {
    const sliced = sentence.slice(start, end);
    if (end > start && sliced.toLowerCase() === needle.toLowerCase() && isWholeSpan(sentence, start, end)) {
      return { start, end };
    }
    const inner = findPhraseIndex(sliced, needle);
    if (inner >= 0) {
      const foundStart = start + inner;
      const foundEnd = foundStart + needle.length;
      if (isWholeSpan(sentence, foundStart, foundEnd)) return { start: foundStart, end: foundEnd };
    }
    const found = findPhraseIndex(sentence, needle);
    if (found >= 0) {
      const foundEnd = found + needle.length;
      if (isWholeSpan(sentence, found, foundEnd)) return { start: found, end: foundEnd };
    }
    const flexible = findFlexiblePhrase(sentence, needle);
    if (flexible) return flexible;
  }
  if (end > start && isWholeSpan(sentence, start, end)) return { start, end };
  return { start: sentence.length, end: sentence.length };
}

function findFlexiblePhrase(sentence: string, phrase: string): { start: number; end: number } | null {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const escaped = words.map((word) => escapeRegExp(word));
  const match = new RegExp(escaped.join("\\s+"), "i").exec(sentence);
  if (!match) return null;
  const start = match.index;
  const end = start + match[0].length;
  if (!isWholeSpan(sentence, start, end)) return null;
  return { start, end };
}

export function blankParts(card: PracticeCard, phrase?: string): { before: string; after: string } {
  const { sentenceText } = card;
  const span = phrase
    ? resolveBlankSpan(sentenceText, phrase, card.blankSpan.start, card.blankSpan.end)
    : card.blankSpan;
  if (span.end > span.start && span.end <= sentenceText.length) {
    return { before: sentenceText.slice(0, span.start), after: sentenceText.slice(span.end) };
  }
  return { before: sentenceText, after: "" };
}

export function blankedText(card: PracticeCard, phrase?: string): string {
  const { before, after } = blankParts(card, phrase);
  return `${before}${FIXED_BLANK}${after}`;
}
