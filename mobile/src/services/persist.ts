import { addDoc, collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { RECENT_CAP, type Conversion, type ConvertErrorCode, type SourceLang, type SourceType } from "../types";
import type { StoredSentence } from "./align";
import { asConvertErrorCode } from "./convertError";

const PROMPT_VERSION = "convert-v1";
const MODEL = "gemini-flash-lite-latest";

export async function persistConversion(
  uid: string,
  row: {
    clientRequestId: string;
    sourceType: SourceType;
    sourceLang: SourceLang;
    sourceText: string;
    outputText: string;
    sentences: StoredSentence[];
    status: "ready" | "failed";
    errorCode?: ConvertErrorCode | null;
  }
): Promise<string | undefined> {
  try {
    const ref = await addDoc(collection(db, "users", uid, "conversions"), {
      clientRequestId: row.clientRequestId,
      sourceType: row.sourceType,
      sourceLang: row.sourceLang,
      sourceText: row.sourceText,
      status: row.status,
      errorCode: row.errorCode ?? null,
      outputText: row.outputText,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      createdAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      sentences: row.sentences
    });
    return ref.id;
  } catch {
    return undefined;
  }
}

const FIRESTORE_READ_MS = 8_000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("firestore_timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function asMillis(value: unknown, fallback: number): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return Number((value as { toMillis: () => number }).toMillis());
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function asRemoteConversion(id: string, raw: Record<string, unknown>): Conversion | null {
  const sourceText = typeof raw.sourceText === "string" ? raw.sourceText : "";
  if (!sourceText) return null;
  const clientRequestId = typeof raw.clientRequestId === "string" && raw.clientRequestId ? raw.clientRequestId : id;
  const sentences = Array.isArray(raw.sentences)
    ? raw.sentences.flatMap((row, index) => {
        if (!row || typeof row !== "object") return [];
        const sentence = row as Record<string, unknown>;
        const text = typeof sentence.text === "string" ? sentence.text : "";
        if (!text) return [];
        const sentenceId = typeof sentence.id === "string" && sentence.id ? sentence.id : `s${index}`;
        const tokens = Array.isArray(sentence.tokens)
          ? sentence.tokens.flatMap((tokenRaw, tokenIndex) => {
              if (!tokenRaw || typeof tokenRaw !== "object") return [];
              const token = tokenRaw as Record<string, unknown>;
              const surface = typeof token.surface === "string" ? token.surface : "";
              const lemma = typeof token.lemma === "string" ? token.lemma : "";
              if (!surface && !lemma) return [];
              return [
                {
                  id: typeof token.id === "string" && token.id ? token.id : `${sentenceId}_t${tokenIndex}`,
                  lemma: lemma || surface.toLowerCase(),
                  surface: surface || lemma,
                  isWord: typeof token.isWord === "boolean" ? token.isWord : /[A-Za-z0-9]/.test(surface || lemma),
                  charStart: typeof token.charStart === "number" ? token.charStart : undefined,
                  charEnd: typeof token.charEnd === "number" ? token.charEnd : undefined
                }
              ];
            })
          : [];
        return [{ id: sentenceId, text, tokens }];
      })
    : [];
  return {
    id: clientRequestId,
    clientRequestId,
    sourceType: raw.sourceType === "voice" ? "voice" : "text",
    sourceText,
    sourceLang:
      raw.sourceLang === "zh" || raw.sourceLang === "en" || raw.sourceLang === "mixed" || raw.sourceLang === "unknown"
        ? raw.sourceLang
        : "unknown",
    outputText: typeof raw.outputText === "string" ? raw.outputText : "",
    sentences,
    status: raw.status === "failed" ? "failed" : "ready",
    errorCode: raw.status === "failed" ? asConvertErrorCode(raw.errorCode) ?? "parse_error" : undefined,
    createdAt: asMillis(raw.createdAt, Date.now()),
    syncState: "synced"
  };
}

export async function loadRemoteConversions(uid: string): Promise<Conversion[]> {
  try {
    const snap = await withTimeout(
      getDocs(query(collection(db, "users", uid, "conversions"), orderBy("createdAt", "desc"), limit(RECENT_CAP))),
      FIRESTORE_READ_MS
    );
    return snap.docs
      .map((row) => asRemoteConversion(row.id, row.data() as Record<string, unknown>))
      .filter((item): item is Conversion => item !== null);
  } catch {
    return [];
  }
}
