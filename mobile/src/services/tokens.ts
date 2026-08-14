import type { Token } from "../types";

export function toUiToken(raw: {
  id?: string;
  index?: number;
  surface?: string;
  lemma?: string;
  pos?: string;
  isWord?: boolean;
  charStart?: number;
  charEnd?: number;
  text?: string;
  start?: number;
  end?: number;
  selectable?: boolean;
}, fallbackIndex: number): Token {
  const surface = String(raw.surface ?? raw.text ?? "");
  const charStart = Number(raw.charStart ?? raw.start ?? -1);
  const charEnd = Number(raw.charEnd ?? raw.end ?? -1);
  const isWord = raw.isWord ?? Boolean(raw.selectable);
  return {
    id: String(raw.id ?? `t${fallbackIndex}`),
    index: Number(raw.index ?? fallbackIndex),
    surface,
    lemma: String(raw.lemma ?? surface.toLowerCase()),
    pos: String(raw.pos ?? (isWord ? "X" : "PUNCT")),
    isWord: Boolean(isWord),
    charStart,
    charEnd,
    text: surface,
    start: charStart,
    end: charEnd,
    selectable: Boolean(isWord) && charStart >= 0
  };
}
