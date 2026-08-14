import type { WordbookItem } from "../types";

/** Cloud rows plus local rows. Local pending/error items are never dropped. */
export function mergeWordbook(local: WordbookItem[], remote: WordbookItem[]): WordbookItem[] {
  const byId = new Map<string, WordbookItem>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const cloud = byId.get(item.id);
    if (!cloud || item.syncState === "pending" || item.syncState === "error") {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => a.dueAt - b.dueAt);
}
