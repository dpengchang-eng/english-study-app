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
import type { AudioStatus, Conversion, ConversionStatus, ReviewResult, Sentence, Token, WordbookItem } from "../types";
import { findBlankSpan, intervalFromResult, nextDueAt } from "./srs";

const conversionsPath = (uid: string) => collection(db, "users", uid, "conversions");
const wordbookPath = (uid: string) => collection(db, "users", uid, "wordbook");

function toAudioStatus(value: unknown): AudioStatus {
  return value === "ready" || value === "unavailable" ? value : "pending";
}

function toConversionStatus(value: unknown): ConversionStatus {
  return value === "error" || value === "loading" ? value : "ready";
}

function serializeTokens(tokens: Token[]): Array<{ text: string; start: number; end: number; selectable: boolean }> {
  return tokens.slice(0, 80).map((token) => ({
    text: token.text.slice(0, 80),
    start: token.start,
    end: token.end,
    selectable: Boolean(token.selectable)
  }));
}

function serializeSentences(sentences: Sentence[]) {
  return sentences.slice(0, 40).map((sentence) => ({
    text: sentence.text.slice(0, 500),
    tokens: serializeTokens(sentence.tokens),
    audioStatus: sentence.audioStatus
  }));
}

export async function createConversionDoc(
  uid: string,
  conversion: Conversion
): Promise<string> {
  const ref = await addDoc(conversionsPath(uid), {
    sourceText: conversion.sourceText.slice(0, 500),
    sourceLang: conversion.sourceLang,
    rewrittenText: (conversion.rewrittenText || " ").slice(0, 4000),
    status: conversion.status,
    sentences: serializeSentences(conversion.sentences),
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function updateConversionDoc(
  uid: string,
  firestoreId: string,
  conversion: Conversion
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "conversions", firestoreId), {
    rewrittenText: (conversion.rewrittenText || " ").slice(0, 4000),
    sourceLang: conversion.sourceLang,
    status: conversion.status,
    sentences: serializeSentences(conversion.sentences)
  });
}

export async function patchSentenceAudio(
  uid: string,
  firestoreId: string,
  sentences: Sentence[]
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "conversions", firestoreId), {
    sentences: serializeSentences(sentences)
  });
}

export function subscribeConversions(uid: string, onChange: (items: Conversion[]) => void): Unsubscribe {
  const q = query(conversionsPath(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.slice(0, 20).map((row) => {
      const data = row.data();
      const sentences = Array.isArray(data.sentences)
        ? data.sentences.map((item: Record<string, unknown>) => ({
            text: String(item.text ?? ""),
            tokens: Array.isArray(item.tokens)
              ? item.tokens.map((token: Record<string, unknown>) => ({
                  text: String(token.text ?? ""),
                  start: Number(token.start ?? 0),
                  end: Number(token.end ?? 0),
                  selectable: token.selectable !== false
                }))
              : [],
            audioStatus: toAudioStatus(item.audioStatus)
          }))
        : [];
      return {
        id: row.id,
        firestoreId: row.id,
        sourceText: String(data.sourceText ?? ""),
        sourceLang: (data.sourceLang ?? "zh") as Conversion["sourceLang"],
        rewrittenText: String(data.rewrittenText ?? ""),
        sentences,
        status: toConversionStatus(data.status),
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
