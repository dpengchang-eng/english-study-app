import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  doc,
  type Unsubscribe
} from "firebase/firestore";
import { db } from "../firebase";
import type { ConversionResult, ReviewResult, SavedItem } from "../types";
import { intervalFromResult, nextDueAt } from "./srs";

const conversionsPath = (uid: string) => collection(db, "users", uid, "conversions");
const savedItemsPath = (uid: string) => collection(db, "users", uid, "savedItems");

export async function saveConversion(uid: string, result: ConversionResult): Promise<string> {
  const ref = await addDoc(conversionsPath(uid), {
    sourceText: result.sourceText.slice(0, 3500),
    sourceLang: result.sourceLang,
    rewrittenText: result.rewrittenText.slice(0, 7000),
    sentences: result.sentences.slice(0, 40).map((sentence) => ({
      text: sentence.text.slice(0, 500),
      words: sentence.words.slice(0, 80).map((word) => ({
        word: word.word.slice(0, 80),
        definition: word.definition.slice(0, 240),
        zh: word.zh.slice(0, 80)
      }))
    })),
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function saveItem(
  uid: string,
  input: {
    phrase: string;
    definition: string;
    sentenceContext: string;
    conversionId: string;
  }
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(savedItemsPath(uid), {
    phrase: input.phrase.slice(0, 180),
    definition: input.definition.slice(0, 480),
    sentenceContext: input.sentenceContext.slice(0, 760),
    conversionId: input.conversionId.slice(0, 80),
    createdAt: now,
    dueAt: now,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0
  });
  return ref.id;
}

export function subscribeSavedItems(uid: string, onChange: (items: SavedItem[]) => void): Unsubscribe {
  const q = query(savedItemsPath(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((row) => {
      const data = row.data();
      return {
        id: row.id,
        phrase: String(data.phrase ?? ""),
        definition: String(data.definition ?? ""),
        sentenceContext: String(data.sentenceContext ?? ""),
        conversionId: String(data.conversionId ?? ""),
        createdAt: data.createdAt as Timestamp,
        dueAt: data.dueAt as Timestamp,
        intervalDays: (data.intervalDays ?? 0) as SavedItem["intervalDays"],
        lastResult: (data.lastResult ?? null) as SavedItem["lastResult"],
        reviewCount: Number(data.reviewCount ?? 0)
      };
    });
    onChange(items);
  });
}

export async function markReview(uid: string, item: SavedItem, result: ReviewResult): Promise<void> {
  await updateDoc(doc(db, "users", uid, "savedItems", item.id), {
    dueAt: nextDueAt(result),
    intervalDays: intervalFromResult(result),
    lastResult: result,
    reviewCount: item.reviewCount + 1
  });
}

export function isDue(item: SavedItem, now = new Date()): boolean {
  try {
    return item.dueAt.toDate().getTime() <= now.getTime();
  } catch {
    return true;
  }
}
