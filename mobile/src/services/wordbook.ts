import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { Token, WordbookItem } from "../types";
import { slugLemma } from "./slug";

const localKey = (uid: string): string => `didao-wordbook-v1:${uid}`;

function asItem(id: string, raw: Record<string, unknown>): WordbookItem | null {
  if (typeof raw.phrase !== "string" || !raw.phrase.trim()) return null;
  const createdAt =
    raw.createdAt && typeof raw.createdAt === "object" && "toMillis" in raw.createdAt
      ? Number((raw.createdAt as { toMillis: () => number }).toMillis())
      : Number(raw.createdAt ?? Date.now());
  const dueAt =
    raw.dueAt && typeof raw.dueAt === "object" && "toMillis" in raw.dueAt
      ? Number((raw.dueAt as { toMillis: () => number }).toMillis())
      : Number(raw.dueAt ?? Date.now());
  const interval = raw.intervalDays;
  return {
    id,
    phrase: raw.phrase,
    ipa: typeof raw.ipa === "string" ? raw.ipa : "",
    senses: Array.isArray(raw.senses) ? raw.senses.filter((item): item is string => typeof item === "string").slice(0, 3) : [],
    sentenceContext: typeof raw.sentenceContext === "string" ? raw.sentenceContext.slice(0, 760) : raw.phrase,
    conversionId: typeof raw.conversionId === "string" ? raw.conversionId.slice(0, 80) : "local",
    blankStart: Number(raw.blankStart ?? 0),
    blankEnd: Number(raw.blankEnd ?? raw.phrase.length),
    createdAt,
    dueAt,
    intervalDays: interval === 1 || interval === 3 || interval === 7 ? interval : 0,
    lastResult:
      raw.lastResult === "again" || raw.lastResult === "1" || raw.lastResult === "3" || raw.lastResult === "7"
        ? raw.lastResult
        : null,
    reviewCount: Number(raw.reviewCount ?? 0),
    syncState: raw.syncState === "pending" || raw.syncState === "error" ? raw.syncState : "synced"
  };
}

export async function loadWordbook(uid: string): Promise<WordbookItem[]> {
  try {
    const raw = await AsyncStorage.getItem(localKey(uid));
    const local = raw ? (JSON.parse(raw) as WordbookItem[]) : [];
    const snap = await getDocs(collection(db, "users", uid, "wordbook"));
    const remote = snap.docs
      .map((row) => asItem(row.id, row.data() as Record<string, unknown>))
      .filter((item): item is WordbookItem => item !== null);
    const byId = new Map<string, WordbookItem>();
    for (const item of local) byId.set(item.id, item);
    for (const item of remote) byId.set(item.id, item);
    const list = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    await AsyncStorage.setItem(localKey(uid), JSON.stringify(list));
    return list;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(localKey(uid));
      return raw ? (JSON.parse(raw) as WordbookItem[]) : [];
    } catch {
      return [];
    }
  }
}

async function writeLocal(uid: string, items: WordbookItem[]): Promise<void> {
  await AsyncStorage.setItem(localKey(uid), JSON.stringify(items));
}

function toFirestore(item: WordbookItem): Record<string, unknown> {
  return {
    phrase: item.phrase.slice(0, 180),
    ipa: item.ipa.slice(0, 80),
    senses: item.senses.slice(0, 3),
    sentenceContext: item.sentenceContext.slice(0, 760),
    conversionId: item.conversionId.slice(0, 80) || "local",
    blankStart: item.blankStart,
    blankEnd: item.blankEnd,
    createdAt: Timestamp.fromMillis(item.createdAt),
    dueAt: Timestamp.fromMillis(item.dueAt),
    intervalDays: item.intervalDays,
    lastResult: item.lastResult,
    reviewCount: item.reviewCount,
    syncState: item.syncState
  };
}

export function phraseFromTokens(tokens: Token[]): { phrase: string; lemmaKey: string; start: number; end: number } {
  const words = tokens.filter((token) => token.isWord);
  const phrase = words.map((token) => token.surface).join(" ").trim();
  const lemmaKey = slugLemma(words.map((token) => token.lemma || token.surface).join(" "));
  const start = words[0]?.charStart ?? 0;
  const last = words[words.length - 1];
  const end = last?.charEnd ?? start + phrase.length;
  return { phrase, lemmaKey, start, end };
}

export async function saveToWordbook(
  uid: string,
  current: WordbookItem[],
  input: {
    tokens: Token[];
    sentenceText: string;
    conversionId: string;
    ipa: string;
    senses: string[];
  }
): Promise<{ items: WordbookItem[]; created: boolean; item: WordbookItem }> {
  const { phrase, lemmaKey, start, end } = phraseFromTokens(input.tokens);
  if (!phrase) throw new Error("没有可保存的词");
  const existing = current.find((item) => item.id === lemmaKey);
  if (existing) {
    return { items: current, created: false, item: existing };
  }
  const now = Date.now();
  const item: WordbookItem = {
    id: lemmaKey,
    phrase: phrase.slice(0, 180),
    ipa: input.ipa.slice(0, 80),
    senses: input.senses.slice(0, 3),
    sentenceContext: input.sentenceText.slice(0, 760),
    conversionId: (input.conversionId || "local").slice(0, 80),
    blankStart: Math.max(0, start),
    blankEnd: Math.min(760, Math.max(start, end)),
    createdAt: now,
    dueAt: now,
    intervalDays: 0,
    lastResult: null,
    reviewCount: 0,
    syncState: "pending"
  };
  const items = [item, ...current];
  await writeLocal(uid, items);
  try {
    await setDoc(doc(db, "users", uid, "wordbook", lemmaKey), toFirestore({ ...item, syncState: "synced" }));
    item.syncState = "synced";
    const synced = items.map((row) => (row.id === item.id ? item : row));
    await writeLocal(uid, synced);
    return { items: synced, created: true, item };
  } catch {
    item.syncState = "error";
    const failed = items.map((row) => (row.id === item.id ? item : row));
    await writeLocal(uid, failed);
    return { items: failed, created: true, item };
  }
}

export async function updateWordbookSrs(uid: string, items: WordbookItem[], next: WordbookItem): Promise<WordbookItem[]> {
  const list = items.map((item) => (item.id === next.id ? next : item));
  await writeLocal(uid, list);
  try {
    await setDoc(
      doc(db, "users", uid, "wordbook", next.id),
      {
        dueAt: Timestamp.fromMillis(next.dueAt),
        intervalDays: next.intervalDays,
        lastResult: next.lastResult,
        reviewCount: next.reviewCount,
        syncState: "synced"
      },
      { merge: true }
    );
    const synced = list.map((item) => (item.id === next.id ? { ...next, syncState: "synced" as const } : item));
    await writeLocal(uid, synced);
    return synced;
  } catch {
    return list;
  }
}

export function dueTodayCount(items: WordbookItem[], now = Date.now()): number {
  const end = endOfSeoulDay(now);
  return items.filter((item) => item.dueAt <= end).length;
}

export function dueItems(items: WordbookItem[], now = Date.now()): WordbookItem[] {
  const end = endOfSeoulDay(now);
  return items.filter((item) => item.dueAt <= end);
}

function endOfSeoulDay(now: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(now));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Date.parse(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:59+09:00`);
}
