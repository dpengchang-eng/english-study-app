import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { PracticeCard, SrsBox, SubmitPracticeResult, WordbookItem } from "../types";
import { resolveBlankSpan } from "./blank";
import { acceptedAnswers, answerFromSources, isCorrectGuess, type StoredAnswer } from "./practiceGrade";
import { queryDueWordbook, updateWordbookSrs } from "./wordbook";

export { blankedText, blankParts, FIXED_BLANK, resolveBlankSpan } from "./blank";

export type PracticeSession = {
  sessionId: string;
  cards: PracticeCard[];
};

type MemoryAnswer = StoredAnswer & { item?: WordbookItem };

const memory = new Map<string, MemoryAnswer>();

const answersKey = (uid: string, sessionId: string): string => `didao-practice-answers-v1:${uid}:${sessionId}`;

async function writeAnswerKey(uid: string, sessionId: string, answers: Record<string, StoredAnswer>): Promise<void> {
  try {
    await AsyncStorage.setItem(answersKey(uid, sessionId), JSON.stringify(answers));
  } catch {
    // submit can still use memory or the wordbook phrase
  }
}

async function readLocalAnswerKey(uid: string, sessionId: string): Promise<Record<string, StoredAnswer> | null> {
  try {
    const raw = await AsyncStorage.getItem(answersKey(uid, sessionId));
    return raw ? (JSON.parse(raw) as Record<string, StoredAnswer>) : null;
  } catch {
    return null;
  }
}

async function readRemoteAnswerKey(uid: string, sessionId: string): Promise<Record<string, StoredAnswer> | null> {
  if (!sessionId || sessionId.startsWith("local")) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid, "practiceSessions", sessionId));
    const key = snap.data()?.answerKey;
    if (!key || typeof key !== "object") return null;
    return key as Record<string, StoredAnswer>;
  } catch {
    return null;
  }
}

function applyBox(item: WordbookItem, box: SrsBox, now: number): WordbookItem {
  const days: Record<SrsBox, number> = { 0: 0, 1: 1, 2: 3, 3: 7 };
  const dueAt = box === 0 ? now + 60_000 : now + days[box] * 24 * 60 * 60 * 1000;
  return {
    ...item,
    box,
    intervalDays: days[box] as 0 | 1 | 3 | 7,
    lastResult: box === 0 ? "again" : (String(days[box]) as "1" | "3" | "7"),
    dueAt,
    reviewCount: item.reviewCount + 1
  };
}

function nextGoodBox(box: SrsBox): SrsBox {
  if (box <= 0) return 1;
  if (box === 1) return 2;
  return 3;
}

export async function createPractice(uid: string, items: WordbookItem[]): Promise<PracticeSession> {
  try {
    memory.clear();
    const due = await queryDueWordbook(uid);
    const source = due.length ? due : items.filter((item) => item.dueAt <= Date.now()).sort((a, b) => a.dueAt - b.dueAt);
    const answerKey: Record<string, StoredAnswer> = {};
    const cards: PracticeCard[] = source.map((item) => {
      const span = resolveBlankSpan(item.sentenceContext, item.phrase, item.blankStart, item.blankEnd);
      const accepted = acceptedAnswers(item.phrase, item.id);
      const row = { expected: item.phrase, accepted, item };
      memory.set(item.id, row);
      answerKey[item.id] = { expected: item.phrase, accepted };
      return {
        wordbookItemId: item.id,
        sentenceText: item.sentenceContext,
        blankSpan: span,
        hintGloss: item.senses[0] ?? ""
      };
    });
    let sessionId = `local-${Date.now()}`;
    try {
      const ref = await addDoc(collection(db, "users", uid, "practiceSessions"), {
        createdAt: Timestamp.now(),
        status: "active",
        cards,
        answerKey
      });
      sessionId = ref.id;
    } catch {
      // UI still works from the in-memory cards; answers also stay in AsyncStorage
    }
    await writeAnswerKey(uid, sessionId, answerKey);
    return { sessionId, cards };
  } catch {
    return { sessionId: `local-${Date.now()}`, cards: [] };
  }
}

export async function submitPractice(
  uid: string,
  items: WordbookItem[],
  wordbookItemId: string,
  input: string,
  attempt: number,
  sessionId?: string
): Promise<{ result: SubmitPracticeResult; items: WordbookItem[] }> {
  const stored =
    (sessionId ? await readLocalAnswerKey(uid, sessionId) : null) ??
    (sessionId ? await readRemoteAnswerKey(uid, sessionId) : null);
  const current = items.find((item) => item.id === wordbookItemId) ?? memory.get(wordbookItemId)?.item;
  const row = answerFromSources(memory.get(wordbookItemId), stored?.[wordbookItemId], current);
  const expected = row?.expected ?? "";
  const accepted = row?.accepted ?? [];
  const correct = row ? isCorrectGuess(input, accepted, expected) : false;
  if (row) memory.set(wordbookItemId, { ...row, item: current });
  if (!current) {
    return { result: { correct, expected, dueAt: Date.now(), box: 0 }, items };
  }
  const shouldGrade = correct || attempt >= 2;
  if (!shouldGrade) {
    return { result: { correct, expected, dueAt: current.dueAt, box: current.box }, items };
  }
  const next = applyBox(current, correct ? nextGoodBox(current.box) : 0, Date.now());
  const nextItems = await updateWordbookSrs(uid, items, next);
  memory.set(wordbookItemId, { expected, accepted, item: next });
  return { result: { correct, expected, dueAt: next.dueAt, box: next.box }, items: nextItems };
}

export function clearPracticeAnswers(): void {
  memory.clear();
}
