import type { ConvertErrorCode, SourceLang } from "../types";

export type GeminiPayload = {
  sourceLang: SourceLang;
  outputText: string;
  sentences: Array<{ text: string; tokens?: unknown[] }>;
};

export type GeminiResult = { ok: true; payload: GeminiPayload } | { ok: false; errorCode: ConvertErrorCode };

const SENTENCE_TEXT_KEYS = ["text", "sentence", "output", "english", "rewrite"] as const;

export function parseJsonText(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("not json");
  }
}

function asLang(value: unknown): SourceLang {
  return value === "zh" || value === "en" || value === "mixed" || value === "unknown" ? value : "unknown";
}

function readSentenceText(row: unknown): string {
  if (typeof row === "string") return row.trim();
  if (!row || typeof row !== "object") return "";
  const data = row as Record<string, unknown>;
  for (const key of SENTENCE_TEXT_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeSentences(raw: unknown, fallbackText: string): GeminiPayload["sentences"] {
  const rows = Array.isArray(raw) ? raw : [];
  const mapped = rows
    .map((row) => {
      const text = readSentenceText(row);
      if (!text) return null;
      const tokens =
        row && typeof row === "object" && Array.isArray((row as { tokens?: unknown }).tokens)
          ? (row as { tokens: unknown[] }).tokens
          : undefined;
      return { text, tokens };
    })
    .filter((row): row is { text: string; tokens?: unknown[] } => row !== null);
  if (mapped.length > 0) return mapped;
  return fallbackText ? [{ text: fallbackText }] : [];
}

function readOutputText(data: Record<string, unknown>): string {
  for (const key of ["outputText", "rewrite", "output"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function parseGeminiJson(text: string): GeminiResult {
  try {
    const raw = parseJsonText(text);
    if (!raw || typeof raw !== "object") return { ok: false, errorCode: "parse_error" };
    const data = raw as Record<string, unknown>;
    const fromField = readOutputText(data);
    const fromSentences = normalizeSentences(data.sentences, "")
      .map((row) => row.text)
      .join(" ");
    const outputText = fromField || fromSentences;
    const sentences = normalizeSentences(data.sentences, outputText);
    if (!outputText || sentences.length === 0) return { ok: false, errorCode: "parse_error" };
    return {
      ok: true,
      payload: {
        sourceLang: asLang(data.sourceLang),
        outputText,
        sentences
      }
    };
  } catch {
    return { ok: false, errorCode: "parse_error" };
  }
}
