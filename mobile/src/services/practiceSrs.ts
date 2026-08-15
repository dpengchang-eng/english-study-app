import type { SrsBox, WordbookItem } from "../types";

export function applyBox(item: WordbookItem, box: SrsBox, now: number): WordbookItem {
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

export function nextGoodBox(box: SrsBox): SrsBox {
  if (box <= 0) return 1;
  if (box === 1) return 2;
  return 3;
}
