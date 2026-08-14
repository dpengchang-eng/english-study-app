import type { Conversion, Token } from "./types";

export const SAMPLE_INPUT = "我想跟你约个时间喝咖啡，看看你方不方便。";

const text = "I'd like to grab coffee with you sometime — does that work for you?";

function sampleTokens(sentence: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\s]/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(sentence)) !== null) {
    const surface = match[0];
    const isWord = /[A-Za-z0-9]/.test(surface);
    tokens.push({
      id: `s0_t${index}`,
      lemma: surface.toLowerCase(),
      surface,
      isWord,
      charStart: match.index,
      charEnd: match.index + surface.length
    });
    index += 1;
  }
  return tokens;
}

export function makeSampleConversion(): Conversion {
  const id = `sample-${Date.now()}`;
  return {
    id,
    clientRequestId: id,
    sourceType: "text",
    sourceText: SAMPLE_INPUT,
    sourceLang: "zh",
    outputText: text,
    status: "ready",
    createdAt: Date.now(),
    sentences: [{ id: "s0", text, tokens: sampleTokens(text) }]
  };
}
