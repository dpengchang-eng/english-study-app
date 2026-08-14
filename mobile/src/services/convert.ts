import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { firebaseApp } from "../firebase";
import type { ConversionResult, Sentence, SourceLang, WordToken } from "../types";

const SYSTEM_PROMPT = `You rewrite the user's Chinese or English into authentic, natural American English.
Keep the meaning. Prefer everyday spoken English: contractions, common idioms, and a natural rhythm.
Do not sound like a textbook. Do not add extra commentary.
Return JSON only.`;

const conversionSchema = Schema.object({
  properties: {
    rewritten: Schema.string({ description: "Full rewritten American English text." }),
    sourceLang: Schema.enumString({ enum: ["zh", "en", "mixed"] }),
    sentences: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string(),
          words: Schema.array({
            items: Schema.object({
              properties: {
                word: Schema.string(),
                definition: Schema.string({
                  description: "Short English definition in this sentence."
                }),
                zh: Schema.string({ description: "Short Chinese gloss." })
              },
              optionalProperties: ["zh"]
            })
          })
        }
      })
    })
  }
});

const userPrompt = (text: string): string =>
  `Rewrite this into idiomatic American English, then split it into sentences and content words.
For each word, give a short English definition for THIS sentence, and a short Chinese gloss.

Text:
${text}`;

function detectSourceLang(text: string): SourceLang {
  const hasHan = /[\u3400-\u9fff]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasHan && hasLatin) return "mixed";
  if (hasHan) return "zh";
  return "en";
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitWords(sentence: string): WordToken[] {
  return sentence
    .split(/\s+/)
    .map((raw) => raw.replace(/^[“"'([{—–-]+|[”"'.,!?;:)\]}—–-]+$/g, ""))
    .filter((word) => /[A-Za-z']/.test(word))
    .map((word) => ({ word, definition: "", zh: "" }));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseJsonFromModel(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed) as unknown;
}

function normalizeResult(raw: unknown, sourceText: string): ConversionResult {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rewritten = asString(data.rewritten) || asString(data.rewrittenText) || sourceText;
  const sourceLang =
    data.sourceLang === "zh" || data.sourceLang === "en" || data.sourceLang === "mixed"
      ? data.sourceLang
      : detectSourceLang(sourceText);

  const rawSentences = Array.isArray(data.sentences) ? data.sentences : [];
  const sentences: Sentence[] = rawSentences
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = asString(row.text);
      if (!text) return null;
      const words = Array.isArray(row.words)
        ? row.words
            .map((token) => {
              if (!token || typeof token !== "object") return null;
              const wordRow = token as Record<string, unknown>;
              const word = asString(wordRow.word);
              if (!word) return null;
              return {
                word,
                definition: asString(wordRow.definition).slice(0, 240),
                zh: asString(wordRow.zh).slice(0, 80)
              };
            })
            .filter((token): token is WordToken => token !== null)
        : splitWords(text);
      return { text, words: words.length > 0 ? words : splitWords(text) };
    })
    .filter((sentence): sentence is Sentence => sentence !== null);

  return {
    sourceText,
    sourceLang,
    rewrittenText: rewritten,
    sentences: sentences.length > 0 ? sentences : splitSentences(rewritten).map((text) => ({ text, words: splitWords(text) }))
  };
}

async function convertWithFirebaseAi(sourceText: string): Promise<string> {
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const modelNames = ["gemini-flash-latest", "gemini-2.5-flash"];
  let lastError: unknown = null;

  for (const model of modelNames) {
    try {
      const generativeModel = getGenerativeModel(ai, {
        model,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: conversionSchema
        }
      });
      const result = await generativeModel.generateContent(userPrompt(sourceText));
      const text = result.response.text();
      if (text.trim()) return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Firebase AI Logic 调用失败");
}

async function convertWithGeminiRest(sourceText: string, apiKey: string): Promise<string> {
  const modelNames = ["gemini-flash-latest", "gemini-2.5-flash"];
  let lastError: unknown = null;

  for (const model of modelNames) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userPrompt(sourceText) }] }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );
      if (!response.ok) {
        lastError = new Error(`Gemini HTTP ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (text.trim()) return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini REST 调用失败");
}

export async function convertToAmericanEnglish(sourceText: string): Promise<ConversionResult> {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    throw new Error("请先输入或说出一句话。");
  }
  if (trimmed.length > 3500) {
    throw new Error("一次请控制在 3500 字以内。");
  }

  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  let rawText = "";
  let firebaseError: unknown = null;

  try {
    rawText = await convertWithFirebaseAi(trimmed);
  } catch (error) {
    firebaseError = error;
    if (geminiKey) {
      rawText = await convertWithGeminiRest(trimmed, geminiKey);
    } else {
      const detail = error instanceof Error ? error.message : "未知错误";
      throw new Error(
        `改写失败：${detail}。可在 mobile/.env 里设置 EXPO_PUBLIC_GEMINI_API_KEY，或在 Firebase 控制台打开 AI Logic / Gemini Developer API。`
      );
    }
  }

  try {
    return normalizeResult(parseJsonFromModel(rawText), trimmed);
  } catch {
    if (firebaseError && !geminiKey) {
      throw new Error("模型返回了无法解析的结果。请再试一次。");
    }
    return normalizeResult({ rewritten: rawText }, trimmed);
  }
}

export async function defineWord(word: string, sentence: string): Promise<{ definition: string; zh: string }> {
  const prompt = `In one short English sentence, define "${word}" as used in: "${sentence}".
Also give a short Chinese gloss.
Return JSON: {"definition":"...","zh":"..."}`;

  const tryParse = (text: string): { definition: string; zh: string } => {
    const parsed = parseJsonFromModel(text) as Record<string, unknown>;
    return {
      definition: asString(parsed.definition).slice(0, 240) || "No short definition available.",
      zh: asString(parsed.zh).slice(0, 80)
    };
  };

  try {
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent(prompt);
    return tryParse(result.response.text());
  } catch {
    const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      return { definition: `Used in: ${sentence}`, zh: "" };
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );
    if (!response.ok) {
      return { definition: `Used in: ${sentence}`, zh: "" };
    }
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    try {
      return tryParse(text);
    } catch {
      return { definition: `Used in: ${sentence}`, zh: "" };
    }
  }
}
