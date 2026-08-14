import type { WordbookItem } from "../types";

/** Cloud rows plus local rows. Local pending/error items are never dropped. */
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

/** Local deletes stay gone even if the cloud row is still there. */
export function excludeDeleted(items: WordbookItem[], deletedIds: string[]): WordbookItem[] {
  if (!deletedIds.length) return items;
  const gone = new Set(deletedIds);
  return items.filter((item) => !gone.has(item.id));
}

export const mergeWordbook = mergeWordbookItems;
