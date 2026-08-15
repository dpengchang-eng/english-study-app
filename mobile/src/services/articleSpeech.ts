export type ArticlePlayMode = "once" | "all" | "loopOne" | "loopAll";

export function speakableItems<T extends { text: string }>(items: T[]): T[] {
  return items.filter((item) => item.text.trim().length > 0);
}

export function indexById(items: Array<{ id: string }>, id: string | null | undefined): number | null {
  if (!id) return null;
  const index = items.findIndex((item) => item.id === id);
  return index >= 0 ? index : null;
}

/** 单句 starts on the current/selected sentence; 听全文 / 全文循环 start at the first sentence. */
export function resolveStartIndex(
  mode: ArticlePlayMode,
  length: number,
  selectedIndex: number | null
): number | null {
  if (length <= 0) return null;
  if (mode === "once" || mode === "loopOne") {
    if (selectedIndex == null || selectedIndex < 0 || selectedIndex >= length) return 0;
    return selectedIndex;
  }
  return 0;
}

export function nextPlayIndex(mode: ArticlePlayMode, index: number, length: number): number | null {
  if (length <= 0) return null;
  if (mode === "once") return null;
  if (mode === "loopOne") return index;
  const next = index + 1;
  if (mode === "all") return next < length ? next : null;
  return next < length ? next : 0;
}
