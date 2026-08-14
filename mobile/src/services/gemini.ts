import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import type { ConvertErrorCode, SourceLang } from "../types";
import { CONVERT_WAIT_MS } from "../types";
import { parseGeminiJson, type GeminiResult } from "./geminiParse";

export type { GeminiPayload, GeminiResult } from "./geminiParse";
export { parseGeminiJson, parseJsonText } from "./geminiParse";

export const GEMINI_MODEL = "gemini-flash-lite-latest";

/** Hard abort after the UI 30s timeout, so a late JSON can still land. */
export const GEMINI_HARD_MS = CONVERT_WAIT_MS + 15_000;

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
Return a JSON object with keys: sourceLang, outputText (the full rewritten English text), and sentences.

Text:
${text}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sourceLang: { type: "STRING", enum: ["zh", "en", "mixed", "unknown"] },
    outputText: { type: "STRING" },
    sentences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          tokens: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                surface: { type: "STRING" },
                lemma: { type: "STRING" },
                pos: { type: "STRING" },
                isWord: { type: "BOOLEAN" }
              },
              required: ["surface", "lemma", "pos", "isWord"]
            }
          }
        },
        required: ["text"]
      }
    }
  },
  required: ["sourceLang", "outputText", "sentences"]
} as const;

function geminiApiKey(): string {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? "";
}

function mapThrown(error: unknown): ConvertErrorCode {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (error instanceof Error && error.name === "AbortError") return "gemini_timeout";
  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("prohibited")) return "safety";
  if (lower.includes("timeout") || lower.includes("deadline")) return "gemini_timeout";
  return "gemini_unavailable";
}

/** Dedicated Gemini Developer API key. Never use the Firebase browser key here. */
async function callRestKey(text: string, apiKey: string, hint?: SourceLang): Promise<GeminiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_HARD_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: USER_PROMPT(text, hint) }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA
          }
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

/** Firebase AI Logic + existing Firebase app. Same model. Not Vertex. */
async function callAiLogic(text: string, hint?: SourceLang): Promise<GeminiResult> {
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(
    ai,
    {
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    },
    { timeout: GEMINI_HARD_MS }
  );
  const result = await model.generateContent(USER_PROMPT(text, hint));
  const out = result.response.text();
  if (!out.trim()) return { ok: false, errorCode: "parse_error" };
  return parseGeminiJson(out);
}

export async function rewriteWithGemini(text: string, hint?: SourceLang): Promise<GeminiResult> {
  const key = geminiApiKey();
  try {
    if (key) return await callRestKey(text, key, hint);
    return await callAiLogic(text, hint);
  } catch (error) {
    return { ok: false, errorCode: mapThrown(error) };
  }
}
