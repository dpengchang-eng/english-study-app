import { resolveErrorCode } from "./convertError";
import type { Conversion, ConvertErrorCode } from "../types";

export const HOME_COPY_ACTION = "复制全文";
export const HOME_LISTEN_ACTION = "听";
export const HOME_SEND_ACTION = "发送";
export const HOME_RETRY_ACTION = "重试";
export const HOME_COPY_TOAST = "已复制";
export const HOME_EMPTY_HINT = "先说一句你想怎么讲，比如“这个周末有空吗”";
export const HOME_INPUT_PLACEHOLDER = "说中文或英文，转成地道的美式说法";
export const HOME_OFFLINE_BANNER = "没有网，没法转换";
export const HOME_LOADING_TEXT = "正在改成更地道的说法…";
export const HOME_QUOTA_BIND_HINT = "绑定后每天 80 次";

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

export function failedTurnShowsRetry(errorCode?: ConvertErrorCode): boolean {
  return resolveErrorCode(errorCode) !== "quota_exceeded";
}

export function failedTurnShowsQuotaHint(errorCode: ConvertErrorCode | undefined, isAnonymous: boolean): boolean {
  return resolveErrorCode(errorCode) === "quota_exceeded" && isAnonymous;
}
