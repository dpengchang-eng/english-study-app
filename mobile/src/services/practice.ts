import type { PracticeCard, WordbookItem } from "../types";
import { dueItems } from "./wordbook";

export type PracticeSession = {
  cards: PracticeCard[];
};

const answers = new Map<string, string[]>();

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

export function createPractice(items: WordbookItem[]): PracticeSession {
  answers.clear();
  const cards = dueItems(items)
    .map((item) => {
      const start = Math.max(0, Math.min(item.blankStart, item.sentenceContext.length));
      const end = Math.max(start, Math.min(item.blankEnd, item.sentenceContext.length));
      answers.set(
        item.id,
        [item.phrase, item.id.replace(/-/g, " "), ...item.phrase.split(/\s+/)]
          .map(normalize)
          .filter(Boolean)
      );
      return {
        wordbookItemId: item.id,
        sentenceText: item.sentenceContext,
        blankSpan: { start, end },
        hintGloss: item.senses[0] ?? ""
      };
    })
    .sort(() => Math.random() - 0.5);
  return { cards };
}

export function submitPractice(wordbookItemId: string, input: string): boolean {
  const expected = answers.get(wordbookItemId) ?? [];
  const guess = normalize(input);
  if (!guess) return false;
  if (expected.some((item) => item === guess)) return true;
  const main = expected[0] ?? "";
  if (main.length >= 5 && editDistance(guess, main) <= 1) return true;
  return false;
}

export function applySrs(item: WordbookItem, result: "again" | "good", now = Date.now()): WordbookItem {
  if (result === "again") {
    return {
      ...item,
      intervalDays: 0,
      lastResult: "again",
      dueAt: now + 60_000,
      reviewCount: item.reviewCount + 1
    };
  }
  const nextDays: 1 | 3 | 7 = item.intervalDays === 0 ? 1 : item.intervalDays === 1 ? 3 : 7;
  return {
    ...item,
    intervalDays: nextDays,
    lastResult: String(nextDays) as "1" | "3" | "7",
    dueAt: now + nextDays * 24 * 60 * 60 * 1000,
    reviewCount: item.reviewCount + 1
  };
}

export function blankedText(card: PracticeCard): string {
  const { sentenceText, blankSpan } = card;
  const start = blankSpan.start;
  const end = blankSpan.end;
  if (end > start && end <= sentenceText.length) {
    return `${sentenceText.slice(0, start)}____${sentenceText.slice(end)}`;
  }
  return sentenceText;
}

export function clearPracticeAnswers(): void {
  answers.clear();
}
