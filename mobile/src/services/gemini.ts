import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import type { ConvertErrorCode, SourceLang } from "../types";
import { CONVERT_WAIT_MS } from "../types";

const MODEL = "gemini-2.0-flash";
const FALLBACK_MODEL = "gemini-flash-latest";

const SYSTEM_PROMPT = `You rewrite the user's Chinese or English into authentic, natural American English.
Keep the meaning. Prefer everyday spoken English: contractions, common idioms, and a natural rhythm.
Do not sound like a textbook. Do not add extra commentary.
Return JSON only.`;

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

export function geminiApiKey(): string {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? "";
}

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
    const outputText = typeof data.outputText === "string" ? data.outputText.trim() : "";
    if (!outputText) return { ok: false, errorCode: "parse_error" };
    if (!Array.isArray(data.sentences) || data.sentences.length === 0) {
      return { ok: false, errorCode: "parse_error" };
    }
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

async function callAiLogic(text: string, hint?: SourceLang): Promise<GeminiResult> {
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
  });
  try {
    const result = await model.generateContent(USER_PROMPT(text, hint));
    const out = result.response.text();
    if (!out.trim()) return { ok: false, errorCode: "parse_error" };
    return parseGeminiJson(out);
  } catch (first) {
    if (mapThrown(first) === "safety") return { ok: false, errorCode: "safety" };
    const fallback = getGenerativeModel(ai, {
      model: FALLBACK_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
    });
    try {
      const result = await fallback.generateContent(USER_PROMPT(text, hint));
      const out = result.response.text();
      if (!out.trim()) return { ok: false, errorCode: "parse_error" };
      return parseGeminiJson(out);
    } catch (second) {
      return { ok: false, errorCode: mapThrown(second) };
    }
  }
}

async function callRestKey(text: string, apiKey: string, hint?: SourceLang): Promise<GeminiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONVERT_WAIT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: USER_PROMPT(text, hint) }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
        })
      }
    );
    if (response.status === 429 || response.status >= 500) {
      return { ok: false, errorCode: "gemini_unavailable" };
    }
    if (!response.ok) return { ok: false, errorCode: "gemini_unavailable" };
    const body = (await response.json()) as {
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
      promptFeedback?: { blockReason?: string };
    };
    if (body.promptFeedback?.blockReason || body.candidates?.[0]?.finishReason === "SAFETY") {
      return { ok: false, errorCode: "safety" };
    }
    const textOut = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!textOut.trim()) return { ok: false, errorCode: "parse_error" };
    return parseGeminiJson(textOut);
  } catch (error) {
    return { ok: false, errorCode: mapThrown(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function rewriteWithGemini(text: string, hint?: SourceLang): Promise<GeminiResult> {
  try {
    const aiLogic = await callAiLogic(text, hint);
    if (aiLogic.ok || aiLogic.errorCode === "safety" || aiLogic.errorCode === "parse_error") {
      return aiLogic;
    }
  } catch (error) {
    if (mapThrown(error) === "safety") return { ok: false, errorCode: "safety" };
  }
  const key = geminiApiKey();
  if (!key) return { ok: false, errorCode: "gemini_unavailable" };
  return callRestKey(text, key, hint);
}
