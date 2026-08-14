import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import type { ConvertErrorCode, SourceLang } from "../types";
import { CONVERT_WAIT_MS } from "../types";

export const GEMINI_MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `You rewrite the user's Chinese or English into authentic, natural American English.
Keep the meaning. Prefer everyday spoken English: contractions, common idioms, and a natural rhythm.
Do not sound like a textbook. Do not add extra commentary.
Return JSON only with keys sourceLang, outputText, and sentences.`;

const USER_PROMPT = (text: string, hint?: SourceLang): string =>
  `Rewrite this into idiomatic American English.
Detect sourceLang as zh, en, mixed, or unknown${hint ? ` (hint: ${hint})` : ""}.
Split the rewrite into sentences.
For each sentence, return coarse tokens with surface, lemma, pos, and isWord.
Do not include character offsets.

Text:
${text}`;

export type GeminiPayload = {
  sourceLang: SourceLang;
  outputText: string;
  sentences: Array<{ text: string; tokens?: unknown[] }>;
};

export type GeminiResult = { ok: true; payload: GeminiPayload } | { ok: false; errorCode: ConvertErrorCode };

/** Gemini Developer API backend. Not Vertex / Agent Platform. */

function parseJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed) as unknown;
}

function asLang(value: unknown): SourceLang {
  return value === "zh" || value === "en" || value === "mixed" || value === "unknown" ? value : "unknown";
}

export function parseGeminiJson(text: string): GeminiResult {
  try {
    const raw = parseJson(text);
    if (!raw || typeof raw !== "object") return { ok: false, errorCode: "parse_error" };
    const data = raw as Record<string, unknown>;
    if (!Array.isArray(data.sentences) || data.sentences.length === 0) {
      return { ok: false, errorCode: "parse_error" };
    }
    const fromField =
      (typeof data.outputText === "string" && data.outputText.trim()) ||
      (typeof data.rewrite === "string" && data.rewrite.trim()) ||
      "";
    const fromSentences = data.sentences
      .map((row) => (row && typeof row === "object" && "text" in row ? String((row as { text?: unknown }).text ?? "") : ""))
      .map((text) => text.trim())
      .filter(Boolean)
      .join(" ");
    const outputText = fromField || fromSentences;
    if (!outputText) return { ok: false, errorCode: "parse_error" };
    return {
      ok: true,
      payload: {
        sourceLang: asLang(data.sourceLang),
        outputText,
        sentences: data.sentences as GeminiPayload["sentences"]
      }
    };
  } catch {
    return { ok: false, errorCode: "parse_error" };
  }
}

function mapThrown(error: unknown): ConvertErrorCode {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (error instanceof Error && error.name === "AbortError") return "gemini_timeout";
  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("prohibited")) return "safety";
  if (lower.includes("timeout") || lower.includes("deadline")) return "gemini_timeout";
  return "gemini_unavailable";
}

/** Live convert uses Firebase AI Logic + the existing Firebase app. No Gemini API key. */
export async function rewriteWithGemini(text: string, hint?: SourceLang): Promise<GeminiResult> {
  try {
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(
      ai,
      {
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
      },
      { timeout: CONVERT_WAIT_MS }
    );
    const result = await model.generateContent(USER_PROMPT(text, hint));
    const out = result.response.text();
    if (!out.trim()) return { ok: false, errorCode: "parse_error" };
    return parseGeminiJson(out);
  } catch (error) {
    return { ok: false, errorCode: mapThrown(error) };
  }
}
