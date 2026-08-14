import { CONVERT_WAIT_MS, ERROR_COPY, SERVER_TEXT_MAX, type ConvertErrorCode, type Conversion, type SourceLang, type SourceType } from "../types";
import { buildSentences } from "./align";
import { resolveErrorCode } from "./convertError";
import { rewriteWithGemini } from "./gemini";
import { persistConversion } from "./persist";
import { checkQuota, incrementQuota } from "./quota";

export type ConvertCallInput = {
  uid: string;
  text: string;
  sourceType: SourceType;
  sourceLangHint?: SourceLang;
  clientRequestId: string;
};

export type ConvertCallOutput = {
  conversionId: string;
  status: "ready" | "failed";
  sourceLang: SourceLang;
  outputText: string;
  sentences: Array<{ id: string; index?: number; text: string; tokens?: unknown[] }>;
  errorCode?: ConvertErrorCode;
};

export function mapConvertOutput(
  output: ConvertCallOutput,
  base: Pick<Conversion, "id" | "clientRequestId" | "sourceType" | "sourceText" | "createdAt">
): Conversion {
  const sentences = (output.sentences ?? []).map((sentence, index) => {
    const tokens = Array.isArray(sentence.tokens)
      ? sentence.tokens.flatMap((raw, tokenIndex) => {
          if (!raw || typeof raw !== "object") return [];
          const token = raw as Record<string, unknown>;
          const id = typeof token.id === "string" && token.id ? token.id : `s${index}_t${tokenIndex}`;
          const lemma = typeof token.lemma === "string" ? token.lemma : "";
          const surface = typeof token.surface === "string" ? token.surface : "";
          if (!id || (!lemma && !surface)) return [];
          return [
            {
              id,
              lemma: lemma || surface.toLowerCase(),
              surface: surface || lemma,
              isWord: Boolean(token.isWord),
              charStart: typeof token.charStart === "number" ? token.charStart : undefined,
              charEnd: typeof token.charEnd === "number" ? token.charEnd : undefined
            }
          ];
        })
      : undefined;
    return {
      id: sentence.id || `s${index}`,
      text: String(sentence.text ?? ""),
      tokens
    };
  });
  return {
    ...base,
    sourceLang: output.sourceLang ?? "unknown",
    outputText: output.outputText ?? "",
    sentences,
    status: output.status === "ready" ? "ready" : "failed",
    errorCode:
      output.errorCode != null
        ? resolveErrorCode(output.errorCode)
        : output.status === "failed"
          ? "parse_error"
          : undefined
  };
}

export function errorMessage(code?: ConvertErrorCode): string {
  return code ? ERROR_COPY[code] : "转换失败。";
}

function failed(errorCode: ConvertErrorCode): ConvertCallOutput {
  return { conversionId: "", status: "failed", sourceLang: "unknown", outputText: "", sentences: [], errorCode };
}

function clean(input: ConvertCallInput): ConvertCallOutput | ConvertCallInput {
  const clientRequestId = input.clientRequestId?.trim() ?? "";
  if (!clientRequestId || clientRequestId.length > 80) return failed("input_invalid");
  if (input.sourceType !== "text" && input.sourceType !== "voice") return failed("input_invalid");
  if (input.sourceLangHint != null && !["zh", "en", "mixed", "unknown"].includes(input.sourceLangHint)) {
    return failed("input_invalid");
  }
  if (typeof input.text !== "string") return failed("input_invalid");
  const text = input.text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (!text) return failed("input_empty");
  if (text.length > SERVER_TEXT_MAX) return failed("input_too_long");
  return { ...input, text, clientRequestId };
}

async function withWait(work: Promise<ConvertCallOutput>): Promise<ConvertCallOutput> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ConvertCallOutput>((resolve) => {
    timer = setTimeout(() => resolve(failed("gemini_timeout")), CONVERT_WAIT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runOnDevice(input: ConvertCallInput): Promise<ConvertCallOutput> {
  const quota = await checkQuota(input.uid);
  if (quota === "quota_exceeded") return failed("quota_exceeded");

  let gemini;
  try {
    gemini = await rewriteWithGemini(input.text, input.sourceLangHint);
  } catch {
    return failed("gemini_unavailable");
  }
  if (!gemini.ok) return failed(gemini.errorCode);

  const sentences = buildSentences(gemini.payload.sentences);
  if (sentences.length === 0) return failed("parse_error");

  await incrementQuota(input.uid);

  const conversionId =
    (await persistConversion(input.uid, {
      clientRequestId: input.clientRequestId,
      sourceType: input.sourceType,
      sourceLang: gemini.payload.sourceLang,
      sourceText: input.text,
      outputText: gemini.payload.outputText,
      sentences,
      status: "ready",
      errorCode: null
    })) ?? "";

  return {
    conversionId,
    status: "ready",
    sourceLang: gemini.payload.sourceLang,
    outputText: gemini.payload.outputText,
    sentences
  };
}

async function persistFailure(input: ConvertCallInput, errorCode: ConvertErrorCode): Promise<string | undefined> {
  return persistConversion(input.uid, {
    clientRequestId: input.clientRequestId || "unknown",
    sourceType: input.sourceType === "voice" ? "voice" : "text",
    sourceLang: input.sourceLangHint ?? "unknown",
    sourceText: typeof input.text === "string" ? input.text : "",
    outputText: "",
    sentences: [],
    status: "failed",
    errorCode
  });
}

/** On-device convert via Firebase AI Logic. Does not call a Cloud Function. */
export async function convertText(input: ConvertCallInput): Promise<ConvertCallOutput> {
  const cleaned = clean(input);
  if ("errorCode" in cleaned && cleaned.status === "failed") {
    const id = await persistFailure(input, cleaned.errorCode ?? "parse_error");
    return { ...cleaned, conversionId: id ?? "" };
  }
  const readyInput = cleaned as ConvertCallInput;
  const result = await withWait(runOnDevice(readyInput));
  if (result.status === "failed") {
    const id = await persistFailure(readyInput, result.errorCode ?? "parse_error");
    return { ...result, conversionId: id ?? "" };
  }
  return result;
}
