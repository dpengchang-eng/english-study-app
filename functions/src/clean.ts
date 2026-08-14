import type { ConvertErrorCode, ConvertTextInput, SourceLang, SourceType } from "./types";
import { MAX_TEXT_LEN } from "./types";

const SOURCE_TYPES: SourceType[] = ["text", "voice"];
const SOURCE_LANGS: SourceLang[] = ["zh", "en", "mixed", "unknown"];

export type CleanOk = { ok: true; text: string; sourceType: SourceType; sourceLangHint?: SourceLang; clientRequestId: string };
export type CleanErr = { ok: false; errorCode: ConvertErrorCode };
export type CleanResult = CleanOk | CleanErr;

export function cleanInput(raw: unknown): CleanResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errorCode: "input_invalid" };
  }
  const input = raw as Partial<ConvertTextInput>;
  const clientRequestId = typeof input.clientRequestId === "string" ? input.clientRequestId.trim() : "";
  if (!clientRequestId || clientRequestId.length > 80) {
    return { ok: false, errorCode: "input_invalid" };
  }
  if (!SOURCE_TYPES.includes(input.sourceType as SourceType)) {
    return { ok: false, errorCode: "input_invalid" };
  }
  if (input.sourceLangHint != null && !SOURCE_LANGS.includes(input.sourceLangHint)) {
    return { ok: false, errorCode: "input_invalid" };
  }
  if (typeof input.text !== "string") {
    return { ok: false, errorCode: "input_invalid" };
  }
  const text = input.text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (!text) {
    return { ok: false, errorCode: "input_empty" };
  }
  if (text.length > MAX_TEXT_LEN) {
    return { ok: false, errorCode: "input_too_long" };
  }
  return {
    ok: true,
    text,
    sourceType: input.sourceType as SourceType,
    sourceLangHint: input.sourceLangHint,
    clientRequestId
  };
}
