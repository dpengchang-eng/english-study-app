import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  type Unsubscribe
} from "firebase/firestore";
import { db } from "../firebase";
import type { Conversion, ConversionStatus, ConvertErrorCode, ReviewResult, SourceLang, SourceType, WordbookItem } from "../types";
import { findBlankSpan, intervalFromResult, nextDueAt } from "./srs";
import { toUiToken } from "./tokens";

const conversionsPath = (uid: string) => collection(db, "users", uid, "conversions");
const wordbookPath = (uid: string) => collection(db, "users", uid, "wordbook");

function toStatus(value: unknown): ConversionStatus {
  return value === "failed" || value === "loading" ? value : "ready";
}

export function subscribeConversions(uid: string, onChange: (items: Conversion[]) => void): Unsubscribe {
  const q = query(conversionsPath(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.slice(0, 20).map((row) => {
      const data = row.data();
      const outputText = String(data.outputText ?? data.rewrittenText ?? "");
      const sentences = Array.isArray(data.sentences)
        ? data.sentences.map((item: Record<string, unknown>, index: number) => ({
            id: String(item.id ?? `s${index}`),
            index: Number(item.index ?? index),
            text: String(item.text ?? ""),
            tokens: Array.isArray(item.tokens)
              ? item.tokens.map((token: Record<string, unknown>, tokenIndex: number) => toUiToken(token, tokenIndex))
              : []
          }))
        : [];
      return {
        id: row.id,
        firestoreId: row.id,
        clientRequestId: String(data.clientRequestId ?? row.id),
        sourceType: (data.sourceType === "voice" ? "voice" : "text") as SourceType,
        sourceText: String(data.sourceText ?? ""),
        sourceLang: (data.sourceLang ?? "unknown") as SourceLang,
        outputText,
        rewrittenText: outputText,
        sentences,
        status: toStatus(data.status),
        errorCode: typeof data.errorCode === "string" ? (data.errorCode as ConvertErrorCode) : undefined,
        createdAt: data.createdAt as Timestamp
      } satisfies Conversion;
    });
    onChange(items);
  });
}

export async function addWordbookItem(
  uid: string,
  input: {
    phrase: string;
    ipa: string;
    senses: string[];
    sentenceContext: string;
    conversionId: string;
  }
): Promise<string> {
  const now = Timestamp.now();
  const blankSpan = findBlankSpan(input.sentenceContext, input.phrase);
  const ref = await addDoc(wordbookPath(uid), {
    phrase: input.phrase.slice(0, 180),
    ipa: input.ipa.slice(0, 80),
    senses: input.senses.slice(0, 3).map((sense) => sense.slice(0, 80)),
    sentenceContext: input.sentenceContext.slice(0, 760),
    conversionId: input.conversionId.slice(0, 80),
    blankStart: blankSpan.start,
    blankEnd: blankSpan.end,
    createdAt: now,
    dueAt: now,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState: "synced"
  });
  return ref.id;
}

export async function deleteWordbookItem(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "wordbook", id));
}

export function subscribeWordbook(uid: string, onChange: (items: WordbookItem[]) => void): Unsubscribe {
  const q = query(wordbookPath(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((row) => {
      const data = row.data();
      return {
        id: row.id,
        phrase: String(data.phrase ?? ""),
        ipa: String(data.ipa ?? ""),
        senses: Array.isArray(data.senses) ? data.senses.map((item) => String(item)).slice(0, 3) : [],
        sentenceContext: String(data.sentenceContext ?? ""),
        conversionId: String(data.conversionId ?? ""),
        blankSpan: {
          start: Number(data.blankStart ?? 0),
          end: Number(data.blankEnd ?? 0)
        },
        createdAt: data.createdAt as Timestamp,
        dueAt: data.dueAt as Timestamp,
        intervalDays: (data.intervalDays ?? 0) as WordbookItem["intervalDays"],
        lastResult: (data.lastResult ?? null) as WordbookItem["lastResult"],
        reviewCount: Number(data.reviewCount ?? 0),
        syncState: data.syncState === "pending" || data.syncState === "error" ? data.syncState : "synced"
      } satisfies WordbookItem;
    });
    onChange(items);
  });
}

export async function markWordbookReview(uid: string, item: WordbookItem, result: ReviewResult): Promise<void> {
  await updateDoc(doc(db, "users", uid, "wordbook", item.id), {
    dueAt: nextDueAt(result),
    intervalDays: intervalFromResult(result),
    lastResult: result,
    reviewCount: item.reviewCount + 1,
    syncState: "synced"
  });
}
