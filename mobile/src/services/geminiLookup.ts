import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import type { LookupResult } from "./lookup";

const MODEL = "gemini-flash-lite-latest";

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

function asLookup(raw: unknown): LookupResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const ipa = typeof data.ipa === "string" ? data.ipa.trim() : "";
  const senses = Array.isArray(data.senses)
    ? data.senses.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
  if (senses.length === 0) return null;
  return { ipa, senses };
}

async function lookupRest(phrase: string, apiKey: string): Promise<LookupResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Return JSON only with keys ipa and senses. ipa is American English phonetic. senses is up to 3 short Simplified Chinese glosses.\nPhrase: ${phrase}`
                }
              ]
            }
          ],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      }
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const textOut = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return asLookup(parseJson(textOut));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupAiLogic(phrase: string): Promise<LookupResult | null> {
  try {
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(
      ai,
      {
        model: MODEL,
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      },
      { timeout: 8000 }
    );
    const result = await model.generateContent(
      `Return JSON only with keys ipa and senses. ipa is American English phonetic. senses is up to 3 short Simplified Chinese glosses.\nPhrase: ${phrase}`
    );
    return asLookup(parseJson(result.response.text()));
  } catch {
    return null;
  }
}

export async function rewriteLookup(phrase: string): Promise<LookupResult | null> {
  const key = geminiApiKey();
  if (key) return lookupRest(phrase, key);
  return lookupAiLogic(phrase);
}
