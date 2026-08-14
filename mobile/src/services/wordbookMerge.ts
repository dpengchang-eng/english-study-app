import type { WordbookItem } from "../types";

/** Keep local pending/error rows when remote also has due items. */
export function mergeWordbookItems(local: WordbookItem[], remote: WordbookItem[]): WordbookItem[] {
  const byId = new Map<string, WordbookItem>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    if (item.syncState === "pending" || item.syncState === "error") {
      byId.set(item.id, item);
      continue;
    }
    if (item.reviewCount > existing.reviewCount) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => a.dueAt - b.dueAt);
}
