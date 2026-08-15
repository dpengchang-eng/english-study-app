import type { Token } from "../types";

/** Inclusive word indexes in the sentence's isWord list. */
export type WordSpan = { start: number; end: number };

export function wordTokens(tokens: Token[]): Token[] {
  return tokens.filter((token) => token.isWord);
}

export function clampSpan(span: WordSpan, wordCount: number): WordSpan {
  if (wordCount <= 0) return { start: 0, end: 0 };
  const start = Math.max(0, Math.min(span.start, wordCount - 1));
  const end = Math.max(start, Math.min(span.end, wordCount - 1));
  return { start, end };
}

export function wholeSentenceSpan(wordCount: number): WordSpan {
  return clampSpan({ start: 0, end: Math.max(0, wordCount - 1) }, wordCount);
}

export function firstWordSpan(): WordSpan {
  return { start: 0, end: 0 };
}

export function isWholeSentence(span: WordSpan, wordCount: number): boolean {
  const next = clampSpan(span, wordCount);
  return wordCount > 0 && next.start === 0 && next.end === wordCount - 1;
}

export function tokensForSpan(tokens: Token[], span: WordSpan): Token[] {
  const words = wordTokens(tokens);
  const next = clampSpan(span, words.length);
  return words.slice(next.start, next.end + 1);
}

export function spanFromSelected(tokens: Token[], selected: Token[]): WordSpan {
  const words = wordTokens(tokens);
  const ids = new Set(selected.filter((token) => token.isWord).map((token) => token.id));
  const indexes = words.map((word, index) => (ids.has(word.id) ? index : -1)).filter((index) => index >= 0);
  if (!indexes.length) return firstWordSpan();
  return clampSpan({ start: Math.min(...indexes), end: Math.max(...indexes) }, words.length);
}

/**
 * frontend-word-sentence.md:
 * adjacent isWord at either end → grow
 * a word inside near one end → shrink that end to the word
 * a non-adjacent word → jump to only that word
 */
export function tapLookupWord(span: WordSpan, tapped: number): WordSpan {
  if (!Number.isInteger(tapped) || tapped < 0) return span;
  if (tapped === span.start - 1) return { start: tapped, end: span.end };
  if (tapped === span.end + 1) return { start: span.start, end: tapped };
  if (tapped < span.start - 1 || tapped > span.end + 1) return { start: tapped, end: tapped };
  if (tapped === span.start && tapped === span.end) return span;
  if (tapped === span.start || tapped === span.end) return { start: tapped, end: tapped };
  const left = tapped - span.start;
  const right = span.end - tapped;
  if (left <= right) return { start: tapped, end: span.end };
  return { start: span.start, end: tapped };
}
