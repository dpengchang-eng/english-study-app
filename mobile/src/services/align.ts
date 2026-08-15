import { SENTENCE_CAP, type Sentence, type Token } from "../types";

type GeminiToken = { surface: string; lemma: string; pos: string; isWord: boolean };

export type StoredToken = {
  id: string;
  index: number;
  surface: string;
  lemma: string;
  pos: string;
  isWord: boolean;
  charStart: number;
  charEnd: number;
};

export type StoredSentence = {
  id: string;
  index: number;
  text: string;
  tokens: StoredToken[];
};

export function isWordish(surface: string): boolean {
  return /[A-Za-z0-9]/.test(surface);
}

export function regexRetokenize(sentence: string, sentenceId: string): StoredToken[] {
  const tokens: StoredToken[] = [];
  const re = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\s]/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(sentence)) !== null) {
    const surface = match[0];
    const word = isWordish(surface);
    tokens.push({
      id: `${sentenceId}_t${index}`,
      index,
      surface,
      lemma: surface.toLowerCase(),
      pos: word ? "X" : "PUNCT",
      isWord: word,
      charStart: match.index,
      charEnd: match.index + surface.length
    });
    index += 1;
  }
  return tokens;
}

function alignTokens(sentence: string, rawTokens: GeminiToken[], sentenceId: string): StoredToken[] {
  if (!rawTokens.length) return regexRetokenize(sentence, sentenceId);
  let cursor = 0;
  let failed = false;
  const aligned = rawTokens.map((raw, index) => {
    const surface = raw.surface || "";
    const from = surface ? sentence.indexOf(surface, cursor) : -1;
    if (from < 0) {
      failed = true;
      return {
        id: `${sentenceId}_t${index}`,
        index,
        surface,
        lemma: raw.lemma || surface.toLowerCase(),
        pos: raw.pos || "X",
        isWord: Boolean(raw.isWord),
        charStart: -1,
        charEnd: -1
      };
    }
    cursor = from + surface.length;
    return {
      id: `${sentenceId}_t${index}`,
      index,
      surface,
      lemma: raw.lemma || surface.toLowerCase(),
      pos: raw.pos || (isWordish(surface) ? "X" : "PUNCT"),
      isWord: Boolean(raw.isWord),
      charStart: from,
      charEnd: from + surface.length
    };
  });
  const result = failed ? regexRetokenize(sentence, sentenceId) : aligned;
  return markWordishIfNone(result, sentence, sentenceId);
}

function markWordishIfNone(tokens: StoredToken[], sentence: string, sentenceId: string): StoredToken[] {
  if (tokens.some((token) => token.isWord)) return tokens;
  const marked = tokens.map((token) => {
    const word = isWordish(token.surface);
    return {
      ...token,
      isWord: word,
      pos: word ? (token.pos && token.pos !== "PUNCT" ? token.pos : "X") : token.pos || "PUNCT"
    };
  });
  if (marked.some((token) => token.isWord)) return marked;
  return sentence.trim() ? regexRetokenize(sentence, sentenceId) : marked;
}

function hasCharOffsets(tokens: Array<{ charStart?: number; charEnd?: number }>): boolean {
  return tokens.every((token) => {
    const start = token.charStart;
    const end = token.charEnd;
    return (
      typeof start === "number" &&
      typeof end === "number" &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start >= 0 &&
      end > start
    );
  });
}

/** History and Gemini rows: missing tokens, no isWord, or missing offsets → regex / align. */
export function ensureTappableTokens(sentence: Pick<Sentence, "id" | "text" | "tokens">): Token[] {
  const text = sentence.text ?? "";
  const id = sentence.id || "s0";
  const raw = Array.isArray(sentence.tokens) ? sentence.tokens : [];
  if (!raw.length) return regexRetokenize(text, id);

  const tokens = raw.some((token) => token.isWord)
    ? raw
    : raw.map((token) => ({ ...token, isWord: isWordish(token.surface) }));

  if (!tokens.some((token) => token.isWord)) return regexRetokenize(text, id);
  if (!hasCharOffsets(tokens)) {
    return alignTokens(
      text,
      tokens.map((token) => ({
        surface: token.surface,
        lemma: token.lemma,
        pos: "",
        isWord: token.isWord
      })),
      id
    );
  }
  return tokens;
}

/** Prefer Gemini sentences; if those are empty, split from outputText so one good rewrite still shows. */
export function sentencesFromGemini(payload: {
  outputText: string;
  sentences: Array<{ text?: unknown; tokens?: unknown }>;
}): StoredSentence[] {
  const built = buildSentences(payload.sentences);
  if (built.length > 0) return built;
  const fallback = payload.outputText.trim();
  return fallback ? buildSentences([{ text: fallback }]) : [];
}

export function buildSentences(raw: Array<{ text?: unknown; tokens?: unknown }>): StoredSentence[] {
  return raw
    .map((row, index) => {
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (!text) return null;
      const id = `s${index}`;
      const tokens = Array.isArray(row.tokens)
        ? row.tokens.map((item) => {
            const token = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
            return {
              surface: typeof token.surface === "string" ? token.surface : "",
              lemma: typeof token.lemma === "string" ? token.lemma : "",
              pos: typeof token.pos === "string" ? token.pos : "",
              isWord: Boolean(token.isWord)
            };
          })
        : [];
      return { id, index, text, tokens: alignTokens(text, tokens, id) };
    })
    .filter((sentence): sentence is StoredSentence => sentence !== null)
    .slice(0, SENTENCE_CAP);
}
