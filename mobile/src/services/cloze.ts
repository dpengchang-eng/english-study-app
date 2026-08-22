import type { Blank, Sentence, WordToken } from "../types";

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\s]/g;

export function tokenize(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const re = new RegExp(WORD_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const surface = match[0];
    tokens.push({
      surface,
      isWord: /[A-Za-z0-9]/.test(surface),
      start: match.index,
      end: match.index + surface.length
    });
  }
  return tokens;
}

export function makeBlankId(sentenceId: string, start: number, end: number): string {
  return `${sentenceId}:${start}-${end}`;
}

export function addBlank(blanks: Blank[], sentence: Sentence, start: number, end: number): Blank[] {
  const answer = sentence.text.slice(start, end);
  if (!answer.trim()) return blanks;
  const id = makeBlankId(sentence.id, start, end);
  if (blanks.some((blank) => blank.id === id)) return blanks;
  const overlap = blanks.some(
    (blank) => blank.sentenceId === sentence.id && !(end <= blank.start || start >= blank.end)
  );
  if (overlap) return blanks;
  return [...blanks, { id, sentenceId: sentence.id, start, end, answer }];
}

export function removeBlank(blanks: Blank[], blankId: string): Blank[] {
  return blanks.filter((blank) => blank.id !== blankId);
}

export function distinctBlankAnswers(blanks: Blank[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const blank of blanks) {
    const key = blank.answer.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(blank.answer);
  }
  return out;
}

export function canUseSelect(blanks: Blank[]): boolean {
  return distinctBlankAnswers(blanks).length >= 2;
}

export function gradeFill(input: string, answer: string): boolean {
  const a = input.trim().toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");
  const b = answer.trim().toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");
  return a.length > 0 && a === b;
}

/** The two option chips are the first two distinct blank answers, in blank order. */
export function optionPair(blanks: Blank[]): [string, string] | null {
  const answers = distinctBlankAnswers(blanks);
  if (answers.length < 2) return null;
  return [answers[0] ?? "", answers[1] ?? ""];
}

export function autoBlankCard(sentences: Sentence[], existing: Blank[]): Blank[] {
  if (existing.length > 0) return existing;
  const next: Blank[] = [];
  for (const sentence of sentences) {
    const words = tokenize(sentence.text).filter((token) => token.isWord && token.surface.length > 3);
    const pick = words[Math.min(1, words.length - 1)];
    if (!pick) continue;
    next.push({
      id: makeBlankId(sentence.id, pick.start, pick.end),
      sentenceId: sentence.id,
      start: pick.start,
      end: pick.end,
      answer: pick.surface
    });
    if (next.length >= 2) break;
  }
  return next;
}

export function blanksForSentence(blanks: Blank[], sentenceId: string): Blank[] {
  return blanks.filter((blank) => blank.sentenceId === sentenceId).sort((a, b) => a.start - b.start);
}
