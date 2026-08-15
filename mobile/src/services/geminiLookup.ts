import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import { parseLookupResult, type LookupQuery, type LookupResult } from "./lookup";

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

const LOOKUP_PROMPT =
  "Return JSON only with keys ipa, pos, senses, and simpleEn. ipa is American English phonetic. pos is a short English part of speech or empty. senses is up to 3 short Simplified Chinese glosses. simpleEn is one short everyday English explanation, not a dictionary essay.";

function lookupPrompt(query: LookupQuery): string {
  return `${LOOKUP_PROMPT}\nLemma: ${query.lemma}\nPhrase: ${query.surface}\nSentence: ${query.sentenceContext}`;
}

async function lookupRest(query: LookupQuery, apiKey: string): Promise<LookupResult | null> {
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
                  text: lookupPrompt(query)
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
    return parseLookupResult(parseJson(textOut));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupAiLogic(query: LookupQuery): Promise<LookupResult | null> {
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
      lookupPrompt(query)
    );
    return parseLookupResult(parseJson(result.response.text()));
  } catch {
    return null;
  }
}

export async function rewriteLookup(query: LookupQuery): Promise<LookupResult | null> {
  const key = geminiApiKey();
  if (key) return lookupRest(query, key);
  return lookupAiLogic(query);
}
