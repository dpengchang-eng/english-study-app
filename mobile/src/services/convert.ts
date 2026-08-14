import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { ERROR_COPY, type ConvertErrorCode, type Conversion, type SourceLang, type SourceType } from "../types";

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
    errorCode: output.errorCode
  };
}

export function errorMessage(code?: ConvertErrorCode): string {
  return code ? ERROR_COPY[code] : "转换失败。";
}

export async function convertText(input: ConvertCallInput): Promise<ConvertCallOutput> {
  try {
    const result = await callable(input);
    return result.data;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code.includes("unauthenticated")) {
      return { conversionId: "", status: "failed", sourceLang: "unknown", outputText: "", sentences: [], errorCode: "input_invalid" };
    }
    return { conversionId: "", status: "failed", sourceLang: "unknown", outputText: "", sentences: [], errorCode: "gemini_unavailable" };
  }
}
