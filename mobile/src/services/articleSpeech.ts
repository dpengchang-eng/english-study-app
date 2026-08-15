export type ArticlePlayMode = "once" | "all" | "loopOne" | "loopAll";

export function speakableItems<T extends { text: string }>(items: T[]): T[] {
  return items.filter((item) => item.text.trim().length > 0);
}

export function indexById(items: Array<{ id: string }>, id: string | null | undefined): number | null {
  if (!id) return null;
  const index = items.findIndex((item) => item.id === id);
  return index >= 0 ? index : null;
}

/** Change speed: stay on this sentence and this mode, or do nothing if idle. */
export function currentPlay(
  mode: ArticlePlayMode | "idle",
  playingId: string | null,
  items: Array<{ id: string }>
): { mode: ArticlePlayMode; index: number } | null {
  if (mode === "idle" || !playingId) return null;
  const index = indexById(items, playingId);
  if (index == null) return null;
  return { mode, index };
}

/** 听 / 循环 start on that sentence. 听全文 / 复读 start at sentence 1. */
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
