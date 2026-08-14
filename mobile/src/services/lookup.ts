import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { firebaseApp } from "../firebase";
import type { LookupResult } from "../types";
import { parseJsonFromModel } from "./convert";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function takeSenses(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    const one = asString(raw);
    return one ? [one] : [];
  }
  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        return asString(row.zh) || asString(row.sense) || asString(row.text);
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 3);
}

function parseLookup(text: string, phrase: string, sentence: string): LookupResult {
  try {
    const parsed = parseJsonFromModel(text) as Record<string, unknown>;
    const senses = takeSenses(parsed.senses);
    return {
      phrase,
      ipa: asString(parsed.ipa).slice(0, 80),
      senses,
      sentence,
      failed: senses.length === 0 && !asString(parsed.ipa)
    };
  } catch {
    return { phrase, ipa: "", senses: [], sentence, failed: true };
  }
}

const promptFor = (phrase: string, sentence: string): string =>
  `Look up the English word or phrase "${phrase}" as used in: "${sentence}".
Return JSON only:
{"ipa":"/.../","senses":["中文义1","中文义2"]}
senses must be 1 to 3 short Simplified Chinese meanings for THIS sentence.`;

async function lookupRest(phrase: string, sentence: string, apiKey: string): Promise<LookupResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptFor(phrase, sentence) }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );
  if (!response.ok) {
    return { phrase, ipa: "", senses: [], sentence, failed: true };
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return parseLookup(text, phrase, sentence);
}

export async function lookupPhrase(phrase: string, sentence: string): Promise<LookupResult> {
  try {
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent(promptFor(phrase, sentence));
    return parseLookup(result.response.text(), phrase, sentence);
  } catch {
    const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      return { phrase, ipa: "", senses: [], sentence, failed: true };
    }
    return lookupRest(phrase, sentence, geminiKey);
  }
}
