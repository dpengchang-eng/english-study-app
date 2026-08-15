export type ArticlePlayMode = "once" | "all" | "loopOne" | "loopAll";
export type ArticleSpeechMode = ArticlePlayMode | "idle";

export type ListenRequest =
  | { kind: "all" }
  | { kind: "loopAll" }
  | { kind: "once"; id: string }
  | { kind: "loopOne"; id: string };

export function isSpeakable(text: string): boolean {
  return text.trim().length > 0;
}

export function speakableItems<T extends { text: string }>(items: T[]): T[] {
  return items.filter((item) => isSpeakable(item.text));
}

/** Current session + no row: close out. Stale session: ignore. */
export function missingPlayItemAction(
  item: unknown,
  session: number,
  currentSession: number
): "skip" | "stop" | "play" {
  if (session !== currentSession) return "skip";
  if (!item) return "stop";
  return "play";
}

export function indexById(items: Array<{ id: string }>, id: string | null | undefined): number | null {
  if (!id) return null;
  const index = items.findIndex((item) => item.id === id);
  return index >= 0 ? index : null;
}

/** 听 / 循环 start on that sentence. Missing / blank lines do not fall back to sentence 1. */
export function resolveStartIndex(
  mode: ArticlePlayMode,
  length: number,
  selectedIndex: number | null
): number | null {
  if (length <= 0) return null;
  if (mode === "once" || mode === "loopOne") {
    if (selectedIndex == null || selectedIndex < 0 || selectedIndex >= length) return null;
    return selectedIndex;
  }
  return 0;
}

/** Same control stops. Any other control starts that mode so only one of the four is live. */
export function decideListenAction(
  mode: ArticleSpeechMode,
  playingId: string | null,
  request: ListenRequest
): { action: "stop" } | { action: "start"; mode: ArticlePlayMode; id?: string } {
  if (request.kind === "all" || request.kind === "loopAll") {
    if (mode === request.kind) return { action: "stop" };
    return { action: "start", mode: request.kind };
  }
  if (mode === request.kind && playingId === request.id) return { action: "stop" };
  return { action: "start", mode: request.kind, id: request.id };
}

/** Scroll so the playing card is on screen. null = already visible. */
export function revealScrollY(
  cardY: number,
  cardHeight: number,
  scrollY: number,
  viewportHeight: number,
  padding = 16
): number | null {
  if (viewportHeight <= 0) return Math.max(0, cardY - padding);
  const viewTop = scrollY;
  const viewBottom = scrollY + viewportHeight;
  if (cardY < viewTop + padding) return Math.max(0, cardY - padding);
  if (cardY + cardHeight > viewBottom - padding) {
    return Math.max(0, cardY + cardHeight - viewportHeight + padding);
  }
  return null;
}

export function nextPlayIndex(mode: ArticlePlayMode, index: number, length: number): number | null {
  if (length <= 0) return null;
  if (mode === "once") return null;
  if (mode === "loopOne") return index;
  const next = index + 1;
  if (mode === "all") return next < length ? next : null;
  return next < length ? next : 0;
}
