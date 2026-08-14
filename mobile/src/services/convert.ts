import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { firebaseApp } from "../firebase";
import { INPUT_CHAR_CAP, type Conversion, type Sentence, type SourceLang, type Token } from "../types";

const SYSTEM_PROMPT = `You rewrite the user's Chinese or English into authentic, natural American English.
Keep the meaning. Prefer everyday spoken English: contractions, common idioms, and a natural rhythm.
Do not sound like a textbook. Do not add extra commentary.
Return JSON only. Tokenize each sentence yourself.`;

const conversionSchema = Schema.object({
  properties: {
    rewritten: Schema.string(),
    sourceLang: Schema.enumString({ enum: ["zh", "en", "mixed"] }),
    sentences: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string(),
          tokens: Schema.array({
            items: Schema.object({
              properties: {
                text: Schema.string(),
                start: Schema.integer(),
                end: Schema.integer()
              }
            })
          })
        }
      })
    })
  }
});

const userPrompt = (text: string): string =>
  `Rewrite this into idiomatic American English.
Split the rewrite into sentences.
For each sentence, return tokens[] covering the sentence in order.
Each token has text plus start/end character offsets into that sentence.
Include words and short contractions as selectable tokens. Punctuation may be its own token.

Text:
${text}`;

function detectSourceLang(text: string): SourceLang {
  const hasHan = /[\u3400-\u9fff]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasHan && hasLatin) return "mixed";
  if (hasHan) return "zh";
  return "en";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

export function parseJsonFromModel(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed) as unknown;
}

function fallbackTokens(sentence: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z']+|[^\sA-Za-z']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sentence)) !== null) {
    const text = match[0];
    tokens.push({
      text,
      start: match.index,
      end: match.index + text.length,
      selectable: /[A-Za-z']/.test(text)
    });
  }
  return tokens;
}

function normalizeTokens(raw: unknown, sentence: string): Token[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallbackTokens(sentence);
  const tokens = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = asString(row.text) || asString(row.word);
      if (!text) return null;
      const start = asInt(row.start, sentence.indexOf(text));
      const end = asInt(row.end, start + text.length);
      return {
        text,
        start: start >= 0 ? start : 0,
        end: end > start ? end : start + text.length,
        selectable: /[A-Za-z']/.test(text)
      };
    })
    .filter((token): token is Token => token !== null);
  return tokens.length > 0 ? tokens : fallbackTokens(sentence);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeConversionPayload(raw: unknown, sourceText: string): Pick<Conversion, "rewrittenText" | "sourceLang" | "sentences"> {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rewritten = asString(data.rewritten) || asString(data.rewrittenText) || sourceText;
  const sourceLang =
    data.sourceLang === "zh" || data.sourceLang === "en" || data.sourceLang === "mixed"
      ? data.sourceLang
      : detectSourceLang(sourceText);
  const rawSentences = Array.isArray(data.sentences) ? data.sentences : [];
  const sentences: Sentence[] = [];
  rawSentences.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const text = asString(row.text);
    if (!text) return;
    sentences.push({
      text,
      tokens: normalizeTokens(row.tokens ?? row.words, text),
      audioStatus: "pending"
    });
  });

  return {
    rewrittenText: rewritten,
    sourceLang,
    sentences:
      sentences.length > 0
        ? sentences
        : splitSentences(rewritten).map((text) => ({
            text,
            tokens: fallbackTokens(text),
            audioStatus: "pending" as const
          }))
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
            generationConfig: { responseMimeType: "application/json" }
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

export async function convertToAmericanEnglish(
  sourceText: string
): Promise<Pick<Conversion, "rewrittenText" | "sourceLang" | "sentences">> {
  const trimmed = sourceText.trim();
  if (!trimmed) throw new Error("请先输入或说出一句话。");
  if (trimmed.length > INPUT_CHAR_CAP) throw new Error(`一次请控制在 ${INPUT_CHAR_CAP} 字以内。`);

  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  let rawText = "";

  try {
    rawText = await convertWithFirebaseAi(trimmed);
  } catch (error) {
    if (geminiKey) {
      rawText = await convertWithGeminiRest(trimmed, geminiKey);
    } else {
      const detail = error instanceof Error ? error.message : "未知错误";
      throw new Error(
        `转换失败：${detail}。可在 mobile/.env 设置 EXPO_PUBLIC_GEMINI_API_KEY，或打开 Firebase AI Logic。`
      );
    }
  }

  try {
    return normalizeConversionPayload(parseJsonFromModel(rawText), trimmed);
  } catch {
    return normalizeConversionPayload({ rewritten: rawText }, trimmed);
  }
}
