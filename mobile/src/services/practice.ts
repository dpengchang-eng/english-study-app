import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { PracticeCard, SrsBox, SubmitPracticeResult, WordbookItem } from "../types";
import { queryDueWordbook, updateWordbookSrs } from "./wordbook";

export type PracticeSession = {
  sessionId: string;
  cards: PracticeCard[];
};

type MemoryAnswer = {
  expected: string;
  accepted: string[];
  item: WordbookItem;
};

const memory = new Map<string, MemoryAnswer>();

function normalize(value: string): string {
  return value.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ").trim();
}

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost);
    }
  }
  return grid[a.length][b.length];
}

function isCorrect(guess: string, accepted: string[], expected: string): boolean {
  const value = normalize(guess);
  if (!value) return false;
  if (accepted.includes(value)) return true;
  return expected.length >= 5 && editDistance(value, normalize(expected)) <= 1;
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
  memory.clear();
  const due = await queryDueWordbook(uid);
  const source = due.length ? due : items.filter((item) => item.dueAt <= Date.now()).sort((a, b) => a.dueAt - b.dueAt);
  const cards: PracticeCard[] = source.map((item) => {
    const start = Math.max(0, Math.min(item.blankStart, item.sentenceContext.length));
    const end = Math.max(start, Math.min(item.blankEnd, item.sentenceContext.length));
    memory.set(item.id, {
      expected: item.phrase,
      accepted: [item.phrase, item.id.replace(/-/g, " "), ...item.phrase.split(/\s+/)].map(normalize).filter(Boolean),
      item
    });
    return {
      wordbookItemId: item.id,
      sentenceText: item.sentenceContext,
      blankSpan: { start, end },
      hintGloss: item.senses[0] ?? ""
    };
  });
  let sessionId = `local-${Date.now()}`;
  try {
    const ref = await addDoc(collection(db, "users", uid, "practiceSessions"), {
      createdAt: Timestamp.now(),
      status: "active",
      cards
    });
    sessionId = ref.id;
  } catch {
    // UI still works from the in-memory cards; answers stay in memory
  }
  return { sessionId, cards };
}

export async function submitPractice(
  uid: string,
  items: WordbookItem[],
  wordbookItemId: string,
  input: string,
  attempt: number
): Promise<{ result: SubmitPracticeResult; items: WordbookItem[] }> {
  const row = memory.get(wordbookItemId);
  const expected = row?.expected ?? "";
  const correct = row ? isCorrect(input, row.accepted, expected) : false;
  const current = items.find((item) => item.id === wordbookItemId) ?? row?.item;
  if (!current) {
    return { result: { correct, expected, dueAt: Date.now(), box: 0 }, items };
  }
  const shouldGrade = correct || attempt >= 2;
  if (!shouldGrade) {
    return { result: { correct, expected, dueAt: current.dueAt, box: current.box }, items };
  }
  const next = applyBox(current, correct ? nextGoodBox(current.box) : 0, Date.now());
  const nextItems = await updateWordbookSrs(uid, items, next);
  memory.set(wordbookItemId, { expected, accepted: row?.accepted ?? [normalize(expected)], item: next });
  return { result: { correct, expected, dueAt: next.dueAt, box: next.box }, items: nextItems };
}

/** Same-width blank every time so the gap does not leak the answer length. */
export const FIXED_BLANK = "________";

export function blankParts(card: PracticeCard): { before: string; after: string } {
  const { sentenceText, blankSpan } = card;
  if (blankSpan.end > blankSpan.start && blankSpan.end <= sentenceText.length) {
    return { before: sentenceText.slice(0, blankSpan.start), after: sentenceText.slice(blankSpan.end) };
  }
  return { before: sentenceText, after: "" };
}

export function blankedText(card: PracticeCard): string {
  const { before, after } = blankParts(card);
  return `${before}${FIXED_BLANK}${after}`;
}

export function clearPracticeAnswers(): void {
  memory.clear();
}
