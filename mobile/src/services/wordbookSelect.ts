import { PHRASE_MAX, SENTENCE_CONTEXT_MAX, type Token, type WordbookItem } from "../types";
import { offsetsFromTokens, resolveBlankSpan } from "./blank";
import { oneLineSimpleEn } from "./lookupParse";
import { slugLemma } from "./slug";

export const EMPTY_SELECTION = "没有可保存的词";

function joinTokenSurfaces(tokens: Token[]): string {
  let out = "";
  for (const token of tokens) {
    if (!token.surface) continue;
    if (!out) {
      out = token.surface;
    } else if (token.isWord) {
      out += ` ${token.surface}`;
    } else {
      out += token.surface;
    }
  }
  return out.trim();
}

function coversAllWords(selected: Token[], sentenceTokens: Token[]): boolean {
  const words = sentenceTokens.filter((token) => token.isWord);
  if (!words.length) return false;
  const selectedIds = new Set(selected.map((token) => token.id));
  return words.every((token) => selectedIds.has(token.id));
}

/** Any consecutive token span, including punctuation and the whole sentence. */
export function selectWordTokens(selected: Token[], sentenceTokens: Token[] = selected): Token[] {
  if (!selected.length) throw new Error(EMPTY_SELECTION);
  const indexes = selected
    .map((token) => sentenceTokens.findIndex((item) => item.id === token.id))
    .filter((index) => index >= 0);
  if (!indexes.length) throw new Error(EMPTY_SELECTION);
  let from = Math.min(...indexes);
  let to = Math.max(...indexes);
  const spanWords = sentenceTokens.slice(from, to + 1);
  if (coversAllWords(spanWords, sentenceTokens)) {
    from = 0;
    to = sentenceTokens.length - 1;
  }
  const span = sentenceTokens.slice(from, to + 1);
  if (!joinTokenSurfaces(span) && !span.some((token) => token.surface.trim())) {
    throw new Error(EMPTY_SELECTION);
  }
  return span;
}

/** Long-press then tap: span from a to b, punctuation inside, no 1–6 cap. */
export function consecutiveTokenSpan(tokens: Token[], a: Token, b: Token): Token[] | null {
  const i = tokens.findIndex((token) => token.id === a.id);
  const j = tokens.findIndex((token) => token.id === b.id);
  if (i < 0 || j < 0) return null;
  try {
    return selectWordTokens(tokens.slice(Math.min(i, j), Math.max(i, j) + 1), tokens);
  } catch {
    return null;
  }
}

export function phraseFromTokens(
  tokens: Token[],
  sentenceText = ""
): { phrase: string; lemmaKey: string; start: number; end: number } {
  const { start, end } = offsetsFromTokens(tokens);
  let phrase =
    sentenceText && start >= 0 && end > start ? sentenceText.slice(start, end) : joinTokenSurfaces(tokens);
  phrase = phrase.trim();
  const words = tokens.filter((token) => token.isWord);
  const lemmaKey = slugLemma(words.map((token) => token.lemma || token.surface).join(" ") || phrase);
  return { phrase, lemmaKey, start, end };
}

export function wordbookDraftFromSelection(input: {
  tokens: Token[];
  sentenceTokens?: Token[];
  sentenceText: string;
  conversionId: string;
  ipa: string;
  senses: string[];
  simpleEn?: string;
}): {
  phrase: string;
  lemmaKey: string;
  blankStart: number;
  blankEnd: number;
  sentenceContext: string;
  conversionId: string;
  ipa: string;
  senses: string[];
  simpleEn: string;
} {
  const sentenceTokens = input.sentenceTokens ?? input.tokens;
  const spanTokens = selectWordTokens(input.tokens, sentenceTokens);
  const sentenceContext = input.sentenceText.slice(0, SENTENCE_CONTEXT_MAX);
  const built = phraseFromTokens(spanTokens, sentenceContext);
  const whole =
    coversAllWords(spanTokens, sentenceTokens) || Boolean(sentenceContext && built.phrase === sentenceContext.trim());
  const phrase = (whole ? sentenceContext : built.phrase).slice(0, PHRASE_MAX).trim();
  if (!phrase) throw new Error(EMPTY_SELECTION);
  const span = whole
    ? { start: 0, end: sentenceContext.length }
    : resolveBlankSpan(sentenceContext, phrase, built.start, built.end);
  return {
    phrase,
    lemmaKey: built.lemmaKey,
    blankStart: span.start,
    blankEnd: span.end,
    sentenceContext,
    conversionId: (input.conversionId || "local").slice(0, 80),
    ipa: input.ipa.slice(0, 80),
    senses: input.senses.filter((item) => item.trim()).slice(0, 3),
    simpleEn: oneLineSimpleEn(input.simpleEn ?? "").slice(0, SENTENCE_CONTEXT_MAX)
  };
}

/** Fill empty gloss on an existing row. Do not touch SRS. */
export function fillEmptyWordbookGloss(
  existing: Pick<WordbookItem, "ipa" | "senses" | "simpleEn">,
  draft: { ipa: string; senses: string[]; simpleEn: string }
): { ipa: string; senses: string[]; simpleEn: string } | null {
  const ipa = existing.ipa.trim() ? existing.ipa : draft.ipa.slice(0, 80);
  const senses = existing.senses.length ? existing.senses : draft.senses.filter((item) => item.trim()).slice(0, 3);
  const simpleEn = existing.simpleEn.trim() ? existing.simpleEn : oneLineSimpleEn(draft.simpleEn).slice(0, SENTENCE_CONTEXT_MAX);
  const sameSenses =
    senses.length === existing.senses.length && senses.every((item, index) => item === existing.senses[index]);
  if (ipa === existing.ipa && simpleEn === existing.simpleEn && sameSenses) return null;
  return { ipa, senses, simpleEn };
}
