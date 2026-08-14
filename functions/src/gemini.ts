import type { ConvertErrorCode, GeminiPayload, SourceLang } from "./types";
import { MODEL } from "./types";

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

export type GeminiResult =
  | { ok: true; payload: GeminiPayload }
  | { ok: false; errorCode: ConvertErrorCode };

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

export async function callGeminiFlash(
  apiKey: string,
  text: string,
  hint?: SourceLang,
  timeoutMs = 20_000
): Promise<GeminiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
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
                    required: ["text", "tokens"]
                  }
                }
              },
              required: ["sourceLang", "outputText", "sentences"]
            }
          }
        })
      }
    );

    if (response.status === 429 || response.status >= 500) {
      return { ok: false, errorCode: "gemini_unavailable" };
    }
    if (!response.ok) {
      return { ok: false, errorCode: "gemini_unavailable" };
    }

    const body = (await response.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (body.promptFeedback?.blockReason || body.candidates?.[0]?.finishReason === "SAFETY") {
      return { ok: false, errorCode: "safety" };
    }

    const textOut = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!textOut.trim()) return { ok: false, errorCode: "parse_error" };
    return parseGeminiJson(textOut);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, errorCode: "gemini_timeout" };
    }
    return { ok: false, errorCode: "gemini_unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
