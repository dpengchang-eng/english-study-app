import type { PracticeCard } from "../types";

/** Same-width blank every time so the gap does not leak the answer length. */
export const FIXED_BLANK = "________";

function indexInsensitive(hay: string, needle: string): number {
  return hay.toLowerCase().indexOf(needle.toLowerCase());
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
    const inner = indexInsensitive(sliced, needle);
    if (inner >= 0) return { start: start + inner, end: start + inner + needle.length };
    const found = indexInsensitive(sentence, needle);
    if (found >= 0) return { start: found, end: found + needle.length };
    const flexible = findFlexiblePhrase(sentence, needle);
    if (flexible) return flexible;
  }
  if (end > start) return { start, end };
  return { start: sentence.length, end: sentence.length };
}

function findFlexiblePhrase(sentence: string, phrase: string): { start: number; end: number } | null {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const match = new RegExp(escaped.join("\\s+"), "i").exec(sentence);
  if (!match) return null;
  return { start: match.index, end: match.index + match[0].length };
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
