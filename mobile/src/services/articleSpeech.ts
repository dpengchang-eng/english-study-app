export type ArticlePlayMode = "once" | "all" | "loopAll";

export function speakableItems<T extends { text: string }>(items: T[]): T[] {
  return items.filter((item) => item.text.trim().length > 0);
}

export function indexById(items: Array<{ id: string }>, id: string | null | undefined): number | null {
  if (!id) return null;
  const index = items.findIndex((item) => item.id === id);
  return index >= 0 ? index : null;
}

/** 听 / 听全文 / 复读: 听 starts on that sentence; 听全文 and 复读 start at the first sentence. */
export function resolveStartIndex(
  mode: ArticlePlayMode,
  length: number,
  selectedIndex: number | null
): number | null {
  if (length <= 0) return null;
  if (mode === "once") {
    if (selectedIndex == null || selectedIndex < 0 || selectedIndex >= length) return 0;
    return selectedIndex;
  }
  return 0;
}

export function nextPlayIndex(mode: ArticlePlayMode, index: number, length: number): number | null {
  if (length <= 0) return null;
  if (mode === "once") return null;
  const next = index + 1;
  if (mode === "all") return next < length ? next : null;
  return next < length ? next : 0;
}
