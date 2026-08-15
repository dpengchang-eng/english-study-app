import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, deleteDoc, doc, getDocs, query, setDoc, Timestamp, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { SrsBox, Token, WordbookItem } from "../types";
import { offsetsFromTokens, resolveBlankSpan } from "./blank";
import { slugLemma } from "./slug";
import { mergeWordbookItems } from "./wordbookMerge";

const localKey = (uid: string): string => `didao-wordbook-v1:${uid}`;
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

const BOX_DAYS: Record<SrsBox, 0 | 1 | 3 | 7> = { 0: 0, 1: 1, 2: 3, 3: 7 };

function asBox(value: unknown, intervalDays?: unknown): SrsBox {
  if (value === 1 || value === 2 || value === 3) return value;
  if (value === 0) return 0;
  if (intervalDays === 1) return 1;
  if (intervalDays === 3) return 2;
  if (intervalDays === 7) return 3;
  return 0;
}

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
  const box = asBox(raw.box, raw.intervalDays);
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
    box,
    intervalDays: BOX_DAYS[box],
    lastResult:
      raw.lastResult === "again" || raw.lastResult === "1" || raw.lastResult === "3" || raw.lastResult === "7"
        ? raw.lastResult
        : null,
    reviewCount: Number(raw.reviewCount ?? 0),
    syncState: raw.syncState === "pending" || raw.syncState === "error" ? raw.syncState : "synced"
  };
}

const PHRASE_MAX = 760;
const EMPTY_SELECTION = "没有可保存的词";

function joinSurfaces(tokens: Token[]): string {
  let out = "";
  for (const token of tokens) {
    if (!out) {
      out = token.surface;
      continue;
    }
    const glue = token.isWord && !/^[,.!?;:'")\]]/.test(token.surface) ? " " : "";
    out += glue + token.surface;
  }
  return out.trim();
}

function wholeSentenceSelection(selected: Token[], sentenceTokens: Token[], sentenceText: string): boolean {
  if (sentenceTokens.length > 0 && selected.length === sentenceTokens.length) return true;
  const allWords = sentenceTokens.filter((token) => token.isWord);
  const selectedWords = selected.filter((token) => token.isWord);
  if (allWords.length > 0 && selectedWords.length === allWords.length) return true;
  const offsets = offsetsFromTokens(selected);
  return offsets.start === 0 && sentenceText.length > 0 && offsets.end >= sentenceText.length;
}

/** Consecutive span only. Punctuation may be in the span. Reject only an empty selection. */
export function selectWordTokens(selected: Token[], sentenceTokens: Token[] = selected): Token[] {
  if (selected.length < 1) throw new Error(EMPTY_SELECTION);
  const indexes = selected
    .map((token) => sentenceTokens.findIndex((item) => item.id === token.id))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) return selected;
  return sentenceTokens.slice(indexes[0], indexes[indexes.length - 1] + 1);
}

/** blankSpan = current selection. A whole-sentence span covers the sentence. */
export function blankSpan(
  sentenceText: string,
  selected: Token[],
  sentenceTokens: Token[] = selected
): { start: number; end: number } {
  const tokens = selected.length ? selectWordTokens(selected, sentenceTokens) : [];
  if (!tokens.length) return { start: sentenceText.length, end: sentenceText.length };
  if (wholeSentenceSelection(tokens, sentenceTokens, sentenceText)) {
    return { start: 0, end: sentenceText.length };
  }
  const offsets = offsetsFromTokens(tokens);
  return resolveBlankSpan(sentenceText, joinSurfaces(tokens), offsets.start, offsets.end);
}

export function phraseFromTokens(tokens: Token[]): { phrase: string; lemmaKey: string; start: number; end: number } {
  const words = tokens.filter((token) => token.isWord);
  const phrase = joinSurfaces(tokens);
  const lemmaKey = slugLemma(words.map((token) => token.lemma || token.surface).join(" "));
  const { start, end } = offsetsFromTokens(tokens);
  return { phrase, lemmaKey, start, end };
}

async function writeLocal(uid: string, items: WordbookItem[]): Promise<void> {
  await AsyncStorage.setItem(localKey(uid), JSON.stringify(items));
}

function toFirestore(item: WordbookItem): Record<string, unknown> {
  return {
    phrase: item.phrase.slice(0, PHRASE_MAX),
    ipa: item.ipa.slice(0, 80),
    senses: item.senses.slice(0, 3),
    sentenceContext: item.sentenceContext.slice(0, 760),
    conversionId: item.conversionId.slice(0, 80) || "local",
    blankStart: item.blankStart,
    blankEnd: item.blankEnd,
    createdAt: Timestamp.fromMillis(item.createdAt),
    dueAt: Timestamp.fromMillis(item.dueAt),
    box: item.box,
    intervalDays: item.intervalDays,
    lastResult: item.lastResult,
    reviewCount: item.reviewCount,
    syncState: item.syncState
  };
}

async function readLocalWordbook(uid: string): Promise<WordbookItem[]> {
  try {
    const raw = await AsyncStorage.getItem(localKey(uid));
    const local = raw ? (JSON.parse(raw) as WordbookItem[]) : [];
    return local
      .map((item) => asItem(item.id, item as unknown as Record<string, unknown>) ?? item)
      .filter((item): item is WordbookItem => Boolean(item?.id && item.phrase));
  } catch {
    return [];
  }
}

async function flushPending(uid: string, items: WordbookItem[]): Promise<WordbookItem[]> {
  const pending = items.filter((item) => item.syncState === "pending" || item.syncState === "error");
  if (!pending.length) return items;
  let next = items;
  for (const item of pending) {
    try {
      await setDoc(doc(db, "users", uid, "wordbook", item.id), toFirestore({ ...item, syncState: "synced" }));
      next = next.map((row) => (row.id === item.id ? { ...row, syncState: "synced" as const } : row));
    } catch {
      next = next.map((row) => (row.id === item.id ? { ...row, syncState: "error" as const } : row));
    }
  }
  await writeLocal(uid, next);
  return next;
}

export async function loadWordbook(uid: string): Promise<WordbookItem[]> {
  const local = await readLocalWordbook(uid);
  try {
    const snap = await withTimeout(getDocs(collection(db, "users", uid, "wordbook")), FIRESTORE_READ_MS);
    const remote = snap.docs
      .map((row) => asItem(row.id, row.data() as Record<string, unknown>))
      .filter((item): item is WordbookItem => item !== null);
    const list = mergeWordbookItems(local, remote);
    await writeLocal(uid, list);
    return flushPending(uid, list);
  } catch {
    return local;
  }
}

/** Review query: dueAt <= now, orderBy dueAt. Always merge local unsynced rows. */
export async function queryDueWordbook(uid: string, now = Date.now()): Promise<WordbookItem[]> {
  let remote: WordbookItem[] = [];
  try {
    const snap = await withTimeout(
      getDocs(
        query(collection(db, "users", uid, "wordbook"), where("dueAt", "<=", Timestamp.fromMillis(now)), orderBy("dueAt"))
      ),
      FIRESTORE_READ_MS
    );
    remote = snap.docs
      .map((row) => asItem(row.id, row.data() as Record<string, unknown>))
      .filter((item): item is WordbookItem => item !== null);
  } catch {
    // local merge still runs
  }
  const local = await readLocalWordbook(uid);
  return mergeWordbookItems(local, remote)
    .filter((item) => item.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function dueNowCount(items: WordbookItem[], now = Date.now()): number {
  return items.filter((item) => item.dueAt <= now).length;
}

export async function saveToWordbook(
  uid: string,
  current: WordbookItem[],
  input: {
    tokens: Token[];
    sentenceTokens?: Token[];
    sentenceText: string;
    conversionId: string;
    ipa: string;
    senses: string[];
  }
): Promise<{ items: WordbookItem[]; created: boolean; item: WordbookItem }> {
  const sentenceTokens = input.sentenceTokens ?? input.tokens;
  const selected = selectWordTokens(input.tokens, sentenceTokens);
  const parsed = phraseFromTokens(selected);
  const sentenceText = input.sentenceText.slice(0, PHRASE_MAX);
  const span = blankSpan(sentenceText, selected, sentenceTokens);
  const phrase = (sentenceText.slice(span.start, span.end) || parsed.phrase).trim();
  if (!phrase) throw new Error(EMPTY_SELECTION);
  const { lemmaKey } = parsed;
  const existing = current.find((item) => item.id === lemmaKey);
  if (existing) {
    return { items: current, created: false, item: existing };
  }
  const now = Date.now();
  const item: WordbookItem = {
    id: lemmaKey,
    phrase: phrase.slice(0, PHRASE_MAX),
    ipa: input.ipa.slice(0, 80),
    senses: input.senses.slice(0, 3),
    sentenceContext: sentenceText,
    conversionId: (input.conversionId || "local").slice(0, 80),
    blankStart: span.start,
    blankEnd: span.end,
    createdAt: now,
    dueAt: now,
    box: 0,
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

export async function deleteFromWordbook(uid: string, items: WordbookItem[], id: string): Promise<WordbookItem[]> {
  const list = items.filter((item) => item.id !== id);
  await writeLocal(uid, list);
  try {
    await deleteDoc(doc(db, "users", uid, "wordbook", id));
  } catch {
    // local delete still applies if Firestore is missing this row
  }
  return list;
}

export async function updateWordbookSrs(uid: string, items: WordbookItem[], next: WordbookItem): Promise<WordbookItem[]> {
  const list = items.map((item) => (item.id === next.id ? next : item));
  await writeLocal(uid, list);
  try {
    await setDoc(
      doc(db, "users", uid, "wordbook", next.id),
      {
        dueAt: Timestamp.fromMillis(next.dueAt),
        box: next.box,
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
    const failed = list.map((item) => (item.id === next.id ? { ...next, syncState: "error" as const } : item));
    await writeLocal(uid, failed);
    return failed;
  }
}
