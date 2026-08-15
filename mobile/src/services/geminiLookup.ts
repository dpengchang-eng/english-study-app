import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import { SENTENCE_CONTEXT_MAX } from "../types";
import { asLookup, type LookupInput, type LookupResult } from "./lookupParse";

export { asLookup };

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

function lookupPrompt(input: LookupInput): string {
  return [
    "Return JSON only with keys ipa, senses, and simpleEn.",
    "ipa is American English phonetic. Empty string is ok.",
    "senses is up to 3 short Simplified Chinese glosses. An empty array is ok.",
    "simpleEn is one short simple English sentence about the selected text. Empty string is ok.",
    `Lemma: ${input.lemma}`,
    `Surface: ${input.surface}`,
    `Sentence: ${input.sentenceContext.slice(0, SENTENCE_CONTEXT_MAX)}`
  ].join("\n");
}

async function lookupRest(input: LookupInput, apiKey: string): Promise<LookupResult> {
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
              parts: [{ text: lookupPrompt(input) }]
            }
          ],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      }
    );
    if (!response.ok) return { ipa: "", senses: [], simpleEn: "" };
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const textOut = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return asLookup(parseJson(textOut));
  } catch {
    return { ipa: "", senses: [], simpleEn: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function lookupAiLogic(input: LookupInput): Promise<LookupResult> {
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
    const result = await model.generateContent(lookupPrompt(input));
    return asLookup(parseJson(result.response.text()));
  } catch {
    return { ipa: "", senses: [], simpleEn: "" };
  }
}

export async function geminiLookup(input: LookupInput): Promise<LookupResult> {
  const key = geminiApiKey();
  if (key) return lookupRest(input, key);
  return lookupAiLogic(input);
}

export async function rewriteLookup(phrase: string): Promise<LookupResult> {
  return geminiLookup({ lemma: phrase, surface: phrase, sentenceContext: "" });
}
