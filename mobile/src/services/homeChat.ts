import type { Conversion } from "../types";

export const HOME_COPY_ACTION = "复制全文";
export const HOME_LISTEN_ACTION = "听";

/** Recents are stored newest-first. Chat shows oldest at top, newest at bottom. */
export function conversationOrder(recents: Conversion[]): Conversion[] {
  return [...recents].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** Ready bubble English: joined sentences, else outputText. */
export function conversionEnglish(item: Conversion): string {
  const joined = (item.sentences ?? []).map((sentence) => sentence.text).filter(Boolean).join(" ");
  return joined || item.outputText || "";
}

export function conversionSpeakable(item: Conversion): Array<{ id: string; text: string }> {
  const sentences = (item.sentences ?? []).filter((sentence) => sentence.text.trim().length > 0);
  if (sentences.length > 0) return sentences;
  const text = item.outputText?.trim() ?? "";
  return text ? [{ id: `${item.id}-all`, text }] : [];
}

export type HomeSendResult = {
  conversionId: string | null;
  openResult: false;
};

/** Same convert pipeline, but the convert tab stays on the conversation. */
export function sendFromComposer(
  draft: string,
  online: boolean,
  startConversion: (text: string, options: { sourceType: "text" }) => string
): HomeSendResult {
  const text = draft.trim();
  if (!text || !online) return { conversionId: null, openResult: false };
  return { conversionId: startConversion(text, { sourceType: "text" }), openResult: false };
}

export function shouldOpenResultOnPress(target: "english" | "copy" | "listen" | "send"): boolean {
  return target === "english";
}
