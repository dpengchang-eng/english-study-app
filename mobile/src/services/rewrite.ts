import { applyRadio, mockRewrite } from "./mockRewrite";
import { rewriteWithGemini } from "./gemini";
import { buildSentences } from "./align";
import type { RewriteRadio, Sentence } from "../types";

export type RewriteResult = {
  rewrite: string;
  sentences: Sentence[];
  reply: string;
  usedMock: boolean;
};

function fromMock(body: string, radio: RewriteRadio): RewriteResult {
  const result = applyRadio(body, radio);
  return { ...result, usedMock: true };
}

/** Try Gemini when EXPO_PUBLIC_USE_GEMINI=1; always fall back to a stable mock. */
export async function rewriteJournal(body: string, radio: RewriteRadio): Promise<RewriteResult> {
  if (radio === 0) return fromMock(body, radio);
  const allowGemini = process.env.EXPO_PUBLIC_USE_GEMINI?.trim() === "1";
  if (!allowGemini) return fromMock(body, radio);

  try {
    const gemini = await Promise.race([
      rewriteWithGemini(body),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 8000);
      })
    ]);
    if (!gemini || !gemini.ok) return fromMock(body, radio);
    const sentences = buildSentences(gemini.payload.sentences).map((sentence) => ({
      id: sentence.id,
      text: sentence.text
    }));
    if (sentences.length === 0) return fromMock(body, radio);
    const rewrite = gemini.payload.outputText || sentences.map((sentence) => sentence.text).join(" ");
    const mock = mockRewrite(body);
    return {
      rewrite,
      sentences,
      reply: radio === 2 ? mock.reply : "",
      usedMock: false
    };
  } catch {
    return fromMock(body, radio);
  }
}
