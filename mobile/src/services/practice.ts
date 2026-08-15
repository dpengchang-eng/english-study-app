import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { PracticeCard, SubmitPracticeResult, WordbookItem } from "../types";
import { resolveBlankSpan } from "./blank";
import { acceptedAnswers, answerFromSources, isCorrectGuess, type StoredAnswer } from "./practiceGrade";
import { applyGoodPass } from "./practiceSrs";
import { practiceSourceItems, returnDueAtToTodaySeoul } from "./reviewCalendar";
import { updateWordbookSrs } from "./wordbook";

export { applyBox, applyGoodPass, keepSrs, nextGoodBox } from "./practiceSrs";
export { returnDueAtToTodaySeoul } from "./reviewCalendar";

export { blankedText, blankParts, FIXED_BLANK, resolveBlankSpan } from "./blank";

/** After a submit (correct or reveal): phrase + up to 3 Chinese senses + simpleEn, one line. */
export function clozeAnswerLine(item: { phrase: string; senses: readonly string[]; simpleEn: string }): string {
  const zh = item.senses.map((sense) => sense.trim()).filter(Boolean).slice(0, 3).join(" · ");
  return [item.phrase.trim(), zh, item.simpleEn.trim()].filter(Boolean).join("  ");
}

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

export async function createPractice(uid: string, items: WordbookItem[]): Promise<PracticeSession> {
  try {
    memory.clear();
    const source = practiceSourceItems(items);
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
  _attempt: number,
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
  return { result: { correct, expected, dueAt: current.dueAt, box: current.box }, items };
}

/** 过: write the existing Good SRS, then the UI goes to the next card. */
export async function passPractice(
  uid: string,
  items: WordbookItem[],
  wordbookItemId: string,
  now = Date.now()
): Promise<WordbookItem[]> {
  const current = items.find((item) => item.id === wordbookItemId);
  if (!current) return items;
  return updateWordbookSrs(uid, items, applyGoodPass(current, now));
}

/** 放回复习: set practiced items' dueAt to today 00:00 Seoul. Keep box. */
export async function returnPracticedToToday(
  uid: string,
  items: WordbookItem[],
  itemIds: readonly string[],
  now = Date.now()
): Promise<WordbookItem[]> {
  let next = items;
  for (const id of itemIds) {
    const current = next.find((item) => item.id === id);
    if (!current) continue;
    const returned = returnDueAtToTodaySeoul(current, now);
    if (returned.dueAt === current.dueAt) continue;
    next = await updateWordbookSrs(uid, next, returned);
  }
  return next;
}

export function clearPracticeAnswers(): void {
  memory.clear();
}
