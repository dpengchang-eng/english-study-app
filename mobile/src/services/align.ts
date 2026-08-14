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

function isWordish(surface: string): boolean {
  return /[A-Za-z0-9]/.test(surface);
}

function regexRetokenize(sentence: string, sentenceId: string): StoredToken[] {
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
  return failed ? regexRetokenize(sentence, sentenceId) : aligned;
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
    .filter((sentence): sentence is StoredSentence => sentence !== null);
}
