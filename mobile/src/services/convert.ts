import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { CONVERT_WAIT_MS, ERROR_COPY, type ConvertErrorCode, type Conversion, type SourceLang, type SourceType } from "../types";
import { errorCodeFromHttpsError, errorCodeFromPayload, resolveErrorCode } from "./convertError";

export type ConvertCallInput = {
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
  sentences: Array<{
    id?: string;
    index?: number;
    text?: string;
    tokens?: unknown[];
  }>;
  errorCode?: ConvertErrorCode;
};

const callable = httpsCallable<ConvertCallInput, ConvertCallOutput>(functions, "convertText");

export function mapConvertOutput(
  output: ConvertCallOutput,
  base: Pick<Conversion, "id" | "clientRequestId" | "sourceType" | "sourceText" | "createdAt">
): Conversion {
  const sentences = (output.sentences ?? []).map((sentence, index) => ({
    id: sentence.id || `s${index}`,
    text: String(sentence.text ?? "")
  }));
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

async function callConvert(input: ConvertCallInput): Promise<ConvertCallOutput> {
  try {
    const result = await callable(input);
    const data = result.data;
    const errorCode = errorCodeFromPayload(data);
    if (errorCode || data.status === "failed") {
      return { ...data, status: "failed", errorCode: errorCode ?? "parse_error" };
    }
    return data;
  } catch (error) {
    return failed(errorCodeFromHttpsError(error) ?? "parse_error");
  }
}

export async function convertText(input: ConvertCallInput): Promise<ConvertCallOutput> {
  return withWait(callConvert(input));
}
