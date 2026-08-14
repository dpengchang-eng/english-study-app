import type { GeminiToken, Sentence, Token } from "./types";

function isWordish(surface: string): boolean {
  return /[A-Za-z0-9]/.test(surface);
}

function failedToken(sentenceId: string, index: number, token: GeminiToken): Token {
  return {
    id: `${sentenceId}_t${index}`,
    index,
    surface: token.surface || "",
    lemma: token.lemma || (token.surface || "").toLowerCase(),
    pos: token.pos || "X",
    isWord: Boolean(token.isWord),
    charStart: -1,
    charEnd: -1
  };
}

export function regexRetokenize(sentence: string, sentenceId: string): Token[] {
  const tokens: Token[] = [];
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

export function alignTokens(sentence: string, rawTokens: GeminiToken[], sentenceId: string): Token[] {
  if (!Array.isArray(rawTokens) || rawTokens.length === 0) {
    return regexRetokenize(sentence, sentenceId);
  }

  let cursor = 0;
  let failed = false;
  const aligned: Token[] = rawTokens.map((raw, index) => {
    const surface = typeof raw.surface === "string" ? raw.surface : "";
    if (!surface) {
      failed = true;
      return failedToken(sentenceId, index, raw);
    }
    const from = sentence.indexOf(surface, cursor);
    if (from < 0) {
      failed = true;
      return failedToken(sentenceId, index, raw);
    }
    const charEnd = from + surface.length;
    cursor = charEnd;
    return {
      id: `${sentenceId}_t${index}`,
      index,
      surface,
      lemma: raw.lemma || surface.toLowerCase(),
      pos: raw.pos || (isWordish(surface) ? "X" : "PUNCT"),
      isWord: Boolean(raw.isWord),
      charStart: from,
      charEnd
    };
  });

  return failed ? regexRetokenize(sentence, sentenceId) : aligned;
}

export function buildSentences(
  raw: Array<{ text?: unknown; tokens?: unknown }>
): Sentence[] {
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
      return {
        id,
        index,
        text,
        tokens: alignTokens(text, tokens, id)
      };
    })
    .filter((sentence): sentence is Sentence => sentence !== null);
}
